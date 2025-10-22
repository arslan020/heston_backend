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
  req.session.user = { id: staff._id, role: 'staff', username, name: `${staff.firstName} ${staff.lastName}` };
  res.json({ message: 'Logged in', user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

export default router;
