// backend/routes/appraisals.js
import { Router } from 'express';
import Appraisal from '../models/Appraisal.js';

const router = Router();

// 💡 TEST MODE: auth bypass (baad me apni auth laga lena)
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

export default router;
