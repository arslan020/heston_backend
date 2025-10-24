import { Resend } from 'resend';

const API_KEY = process.env.RESEND_API_KEY;
if (!API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}
const resend = new Resend(API_KEY);

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>';
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('📧 Resend error:', error);
    throw new Error(error?.message || 'Resend failed');
  }
  console.log('📬 Resend accepted:', data?.id);
  return data;
}
