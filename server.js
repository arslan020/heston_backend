import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import dvlaRoutes from './routes/dvla.js';
import appraisalsRouter from './routes/appraisals.js'; // ⬅️ ADD

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

await connectDB(process.env.MONGO_URI);

// (optional) seed admin
(async () => {
  const existing = await Admin.findOne({ username: 'admin' });
  if (!existing) {
    const passwordHash = await bcrypt.hash('1234', 10);
    await Admin.create({ username: 'admin', passwordHash });
    console.log('👑 Seeded default admin: admin / 1234');
  }
})();

// --- parsers & CORS (NOTE: before routes)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ✅ CORS config (array-based + explicit OPTIONS)
const allowedOrigins = [
  'http://localhost:3000',
  'https://heston-app-henh.vercel.app',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Preflight for all routes
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

// logs
app.use(morgan('dev'));

// sessions
app.set('trust proxy', 1); // Render/Proxy ke liye
const isProd = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: 'heston_auth',
    collectionName: 'sessions'
  })
}));

// --- mount routes (make sure this line exists)
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dvla', dvlaRoutes);
app.use(appraisalsRouter); // ⬅️ VERY IMPORTANT

app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 debug helper
app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));