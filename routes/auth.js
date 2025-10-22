import { Router } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';

const router = Router();
const prod = process.env.NODE_ENV === 'production';

// GET /api/auth/me  → current user (no cache, so Safari stale data na dikhaye)
router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json(req.session?.user || null);
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    // 🔒 Safari session-race fix
    return req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });

      req.session.user = { id: admin._id, role: 'admin', username };

      res.set('Cache-Control', 'no-store');
      return req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: 'Session save error' });
        return res.json({ message: 'Logged in', user: req.session.user });
      });
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/staff/login
router.post('/staff/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await Staff.findOne({ username });
    if (!staff) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, staff.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const name = [staff.firstName, staff.lastName].filter(Boolean).join(' ');

    // 🔒 Safari session-race fix
    return req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });

      req.session.user = {
        id: staff._id,
        role: 'staff',
        username,
        name,
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
      };

      res.set('Cache-Control', 'no-store');
      return req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: 'Session save error' });
        return res.json({ message: 'Logged in', user: req.session.user });
      });
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // destroy session then clear cookie with SAME attributes as in server.js
  req.session.destroy(() => {
    const clearOpts = {
      httpOnly: true,
      sameSite: prod ? 'none' : 'lax',
      secure: prod ? true : false,
      path: '/',
      // ⚠️ If you set cookie.domain in server.js, uncomment this and match it:
      // domain: '.hestonautomotive.com',
    };
    // Default session cookie name in express-session is 'connect.sid'
    res.clearCookie('connect.sid', clearOpts);
    return res.json({ message: 'Logged out' });
  });
});

export default router;
