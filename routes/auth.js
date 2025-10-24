// src/routes/auth.js (or wherever your auth router lives)
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';
import { sendMail } from '../config/mailer.js';

const router = Router();

// =================== SESSION/ME ===================
router.get('/me', (req, res) => {
  res.json(req.session?.user || null);
});

// =================== ADMIN LOGIN ===================
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  req.session.user = { id: admin._id, role: 'admin', username };
  res.json({ message: 'Logged in', user: req.session.user });
});

// =================== STAFF LOGIN ===================
router.post('/staff/login', async (req, res) => {
  const { username, password } = req.body;

  const staff = await Staff.findOne({ username });
  if (!staff) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, staff.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  // Clean display name
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(' ');

  req.session.user = {
    id: staff._id,
    role: 'staff',
    username,
    name,
    firstName: staff.firstName || '',
    lastName:  staff.lastName  || ''
  };

  res.json({ message: 'Logged in', user: req.session.user });
});

// =================== LOGOUT ===================
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// =================== PASSWORD RESET ===================

// POST /api/auth/forgot-password
// Only send email if user exists; otherwise 400
router.post('/forgot-password', async (req, res) => {
  try {
    const raw = (req.body?.email || '');
    const email = raw.trim().toLowerCase();

    // Basic format validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Lookup user by normalized email
    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(400).json({ message: 'Invalid email address. No account found.' });
    }

    // Generate token + 1h expiry; save on user
    const token = crypto.randomBytes(32).toString('hex');
    staff.resetPasswordToken = token;
    staff.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await staff.save();

    // Compose email
    const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password/${token}`;
    const subject = 'Password Reset - Heston Automotive';
    const html = `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
    `;

    // Send mail (Resend/SendGrid behind sendMail)
    await sendMail({ to: staff.email, subject, html });
    console.log('📧 Reset mail sent to', staff.email);

    return res.status(200).json({
      message: 'Password reset email sent successfully. Please check your inbox or spam folder.'
    });
  } catch (err) {
    console.error('forgot-password error:', err?.message || err);
    return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ message: 'Password required' });

  const staff = await Staff.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!staff) return res.status(400).json({ message: 'Token invalid or expired' });

  staff.passwordHash = await bcrypt.hash(password, 10);
  staff.resetPasswordToken = null;
  staff.resetPasswordExpires = null;
  await staff.save();

  res.json({ message: 'Password has been reset successfully' });
});

export default router;
