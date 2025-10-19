import { Router } from 'express';
import { ensureAuth } from '../middleware/ensureAuth.js';

const router = Router();

router.post('/lookup', ensureAuth, async (req, res) => {
  try {
    const { reg } = req.body;
    if (!reg) return res.status(400).json({ error: 'Registration number required' });

    const resp = await fetch(process.env.DVLA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.DVLA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ registrationNumber: reg.trim().toUpperCase() })
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(400).json({ error: data?.message || 'DVLA API error' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicle data' });
  }
});

export default router;
