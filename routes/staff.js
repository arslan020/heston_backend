// backend/routes/staff.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Staff from '../models/Staff.js';
import { ensureAuth } from '../middleware/ensureAuth.js';
import { ensureAdmin } from '../middleware/ensureAdmin.js';

const router = Router();

/**
 * GET /api/staff
 * List all staff (no passwordHash in response)
 */
router.get('/', ensureAuth, ensureAdmin, async (_req, res) => {
  const staff = await Staff.find().select('-passwordHash');
  res.json(staff);
});

/**
 * POST /api/staff
 * Create staff
 */
router.post('/', ensureAuth, ensureAdmin, async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;
  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({ firstName, lastName, username, email, passwordHash });
  res.status(201).json({
    _id: staff._id,
    firstName,
    lastName,
    username,
    email,
    createdAt: staff.createdAt,
  });
});

/**
 * PUT /api/staff/:id
 * Update basic fields (firstName, lastName, username, email)
 */
router.put('/:id', ensureAuth, ensureAdmin, async (req, res) => {
  const { firstName, lastName, username, email } = req.body;
  const update = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;
  if (username !== undefined) update.username = username;
  if (email !== undefined) update.email = email;

  const updated = await Staff.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).select('-passwordHash');

  if (!updated) return res.status(404).json({ error: 'Staff not found' });
  res.json(updated);
});

/**
 * POST /api/staff/:id/reset-password
 * Auto-generate a temporary password, save hash, and return the temp password once
 */
router.post('/:id/reset-password', ensureAuth, ensureAdmin, async (req, res) => {
  const user = await Staff.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Staff not found' });

  // simple 10-char temp password (letters+digits)
  const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  user.passwordHash = await bcrypt.hash(tempPassword, 10);
  await user.save();

  // IMPORTANT: never store/show raw password later — return once
  res.json({ tempPassword });
});

/**
 * PUT /api/staff/:id/password
 * Set a new password manually
 */
router.put('/:id/password', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password required' });

    const user = await Staff.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Staff not found' });

    // hash & save
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

/**
 * DELETE /api/staff/:id
 * Delete staff
 */
router.delete('/:id', ensureAuth, ensureAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
