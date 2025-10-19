import { Router } from 'express';
import bcrypt from 'bcrypt';
import Staff from '../models/Staff.js';
import { ensureAuth } from '../middleware/ensureAuth.js';
import { ensureAdmin } from '../middleware/ensureAdmin.js';

const router = Router();

router.get('/', ensureAuth, ensureAdmin, async (_req, res) => {
  const staff = await Staff.find().select('-passwordHash');
  res.json(staff);
});

router.post('/', ensureAuth, ensureAdmin, async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;
  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({ firstName, lastName, username, email, passwordHash });
  res.status(201).json({
    _id: staff._id,
    firstName, lastName, username, email, createdAt: staff.createdAt
  });
});

router.delete('/:id', ensureAuth, ensureAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
