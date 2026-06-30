const nodemailer = require('nodemailer');

const requiredMailConfig = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const ensureMailConfig = () => {
  const missing = requiredMailConfig.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Faltan variables SMTP: ${missing.join(', ')}`);
  }
};

const createTransporter = () => {
  ensureMailConfig();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendRecoveryCode = async ({ to, code }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Código de recuperación - Retro Garage',
    text: `Tu código de recuperación es ${code}. Este código vence en 15 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Recuperación de contraseña</h2>
        <p>Tu código de recuperación es:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>Este código vence en 15 minutos.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
  });
};

module.exports = { sendRecoveryCode };
