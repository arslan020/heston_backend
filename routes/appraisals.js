// backend/routes/appraisals.js
import { Router } from 'express';
import Appraisal from '../models/Appraisal.js';

const router = Router();

// 💡 TEST MODE: auth bypass (add real auth later)
const requireStaff = (_req, _res, next) => next();
const requireAdmin = (_req, _res, next) => next();

// Staff creates an appraisal
router.post('/api/appraisals', requireStaff, async (req, res) => {
  try {
    console.log('POST /api/appraisals hit', req.body?.reg);
    const doc = await Appraisal.create({ ...req.body });
    res.json(doc);
  } catch (e) {
    console.error('Create appraisal error:', e);
    res.status(500).json({ error: 'Failed to create appraisal' });
  }
});

// Admin lists all appraisals
router.get('/api/appraisals/admin', requireAdmin, async (_req, res) => {
  try {
    console.log('GET /api/appraisals/admin hit');
    const list = await Appraisal.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) {
    console.error('Load appraisals error:', e);
    res.status(500).json({ error: 'Failed to load appraisals' });
  }
});

// ✅ Staff - get only their own appraisals (SIBLING route, not nested)
router.get('/api/appraisals/mine', requireStaff, async (req, res) => {
  try {
    // In production, read from req.user set by your auth middleware
    const username = (req.user?.username || req.query.username || '').trim().toLowerCase();
    const email    = (req.user?.email    || req.query.email    || '').trim().toLowerCase();

    if (!username && !email) {
      return res.status(400).json({ error: 'Missing user identity (username/email).' });
    }

    console.log(`GET /api/appraisals/mine for user: ${username || email}`);

    const mine = await Appraisal.find({
      $or: [
        { submittedByUsername: username },
        { submittedByEmail: email }
      ]
    }).sort({ createdAt: -1 }).lean();

    res.json(mine);
  } catch (e) {
    console.error('Load my appraisals error:', e);
    res.status(500).json({ error: 'Failed to load your appraisals' });
  }
});

export default router;
