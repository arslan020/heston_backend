import { Router } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';

const router = Router();

router.get('/me', (req, res) => {
  res.json(req.session?.user || null);
});

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  req.session.user = { id: admin._id, role: 'admin', username };
  res.json({ message: 'Logged in', user: req.session.user });
});

router.post('/staff/login', async (req, res) => {
  const { username, password } = req.body;
  const staff = await Staff.findOne({ username });
  if (!staff) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, staff.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  // Build a clean "name" without the word 'undefined'
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


router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

import crypto from 'crypto';
import { sendMail } from '../config/mailer.js';

// =================== PASSWORD RESET ===================

// POST /api/auth/forgot-password
// POST /api/auth/forgot-password
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const raw = (req.body?.email || "");
    const email = raw.trim().toLowerCase();

    // Invalid format par bhi generic success return karo (security + better UX)
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(200).json({
        message:
          'If that email exists, a reset link has been sent. Please check your inbox and also your junk or spam folder.'
      });
    }

    // DB me normalized email se lookup
    const staff = await Staff.findOne({ email });

    if (staff) {
      // Token generate + save
      const token = crypto.randomBytes(32).toString('hex');
      staff.resetPasswordToken = token;
      staff.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await staff.save();

      // Reset link
      const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password/${token}`;
      const subject = 'Password Reset - Heston Automotive';
      const html = `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
      `;

      // Email bhejo (fail ho to bhi client ko 200 hi dena hai)
      try {
        await sendMail({ to: staff.email, subject, html });
        console.log('📧 Reset mail sent to', staff.email);
      } catch (e) {
        console.error('📧 Email send failed:', e.message);
      }
    }

    // HAMESHA generic success (user enumeration avoid)
    return res.status(200).json({
      message:
        'If that email exists, a reset link has been sent. Please check your inbox and also your junk or spam folder.'
    });
  } catch (err) {
    console.error('forgot-password error:', err);
    // Error par bhi generic 200
    return res.status(200).json({
      message:
        'If that email exists, a reset link has been sent. Please check your inbox and also your junk or spam folder.'
    });
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
