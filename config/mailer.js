// backend/config/mailer.js (ESM)
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'no-reply@localhost';
  return transporter.sendMail({ from, to, subject, html, text });
}
