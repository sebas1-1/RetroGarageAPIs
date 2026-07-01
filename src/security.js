const crypto = require('crypto');

const ENCRYPTION_PREFIX = 'enc:v1:';
const PASSWORD_PREFIX = 'pwd:v1:';
const FALLBACK_SECRET = 'retro-garage-dev-secret-change-me';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const getSecret = () =>
  process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || FALLBACK_SECRET;

const deriveKey = (purpose) =>
  crypto.createHash('sha256').update(`${getSecret()}:${purpose}`).digest();

const encryptionKey = deriveKey('field-encryption');
const ivKey = deriveKey('field-iv');

const buildIv = (fieldName, plaintext) =>
  crypto
    .createHmac('sha256', ivKey)
    .update(`${fieldName}:${plaintext}`)
    .digest()
    .subarray(0, 12);

const isEncrypted = (value) =>
  typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);

const encryptField = (fieldName, value) => {
  if (value === null || value === undefined || value === '') return value || null;
  if (isEncrypted(value)) return value;

  const text = String(value);
  const iv = buildIv(fieldName, text);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(Buffer.from(fieldName));

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
};

const decryptField = (fieldName, value) => {
  if (value === null || value === undefined || value === '') return value || null;
  if (!isEncrypted(value)) return value;

  const payload = Buffer.from(value.slice(ENCRYPTION_PREFIX.length), 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAAD(Buffer.from(fieldName));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = crypto.scryptSync(password, salt, 64).toString('base64');
  return `${PASSWORD_PREFIX}${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash) return false;

  if (!storedHash.startsWith(PASSWORD_PREFIX)) {
    return Buffer.from(password).toString('base64') === storedHash;
  }

  const [, , salt, expectedHash] = storedHash.split(':');
  const actualHash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'base64');

  return expected.length === actualHash.length && crypto.timingSafeEqual(expected, actualHash);
};

const generateOtpSecret = () => {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  let secret = '';

  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    secret += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return secret;
};

const base32ToBuffer = (secret = '') => {
  const cleanSecret = String(secret).replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  const bytes = [];

  for (const char of cleanSecret) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) return Buffer.alloc(0);
    bits += value.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateTotp = (secret, timeStep = Math.floor(Date.now() / 30000)) => {
  const key = base32ToBuffer(secret);
  if (!key.length) return null;

  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
  counter.writeUInt32BE(timeStep >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
};

const verifyTotp = (secret, token, window = 1) => {
  const cleanToken = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentStep = Math.floor(Date.now() / 30000);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotp(secret, currentStep + offset);
    if (expected && crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUrl = ({ issuer = 'RetroGarage', account, secret }) => {
  const label = `${issuer}:${account}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

module.exports = {
  buildOtpAuthUrl,
  decryptField,
  encryptField,
  generateOtpSecret,
  generateTotp,
  hashPassword,
  verifyTotp,
  verifyPassword,
};
