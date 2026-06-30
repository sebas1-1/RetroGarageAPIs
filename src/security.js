const crypto = require('crypto');

const ENCRYPTION_PREFIX = 'enc:v1:';
const PASSWORD_PREFIX = 'pwd:v1:';
const FALLBACK_SECRET = 'retro-garage-dev-secret-change-me';

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

module.exports = {
  decryptField,
  encryptField,
  hashPassword,
  verifyPassword,
};
