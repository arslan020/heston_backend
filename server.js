
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import morgan from 'morgan';
import helmet from 'helmet';

import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import dvlaRoutes from './routes/dvla.js';
import appraisalsRouter from './routes/appraisals.js'; // ⬅️ KEEP

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// ---------------- Security/Headers --------------------------
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ---------------- DB ----------------------------------------
await connectDB(process.env.MONGO_URI);

// (optional) seed admin (dev convenience)
(async () => {
  try {
    const existing = await Admin.findOne({ username: 'admin' });
    if (!existing) {
      const passwordHash = await bcrypt.hash('1234', 10);
      await Admin.create({ username: 'admin', passwordHash });
      console.log('👑 Seeded default admin: admin / 1234');
    }
  } catch (e) {
    console.error('Admin seed error:', e?.message || e);
  }
})();

// ------------- Parsers --------------------------------------
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// --------- Logs ---------------------------------------------
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// -------- Reverse proxy (Render/Heroku/Cloudflare) ----------
app.set('trust proxy', 1);

// ------------- CORS (⚠️ BEFORE session) ---------------------
const STATIC_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://heston-app-henh.vercel.app',
  'https://appraise.hestonautomotive.com',
].filter(Boolean);

const ENV_ORIGINS = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...new Set([...STATIC_ORIGINS, ...ENV_ORIGINS])];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/cURL
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      try {
        const { hostname } = new URL(origin);
        if (hostname.endsWith('.hestonautomotive.com')) return cb(null, true);
      } catch {}
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  })
);

// Explicit preflight handler (helps some hosts)
app.options('*', (req, res) => {
  const reqOrigin = req.headers.origin;
  if (reqOrigin) {
    res.set('Access-Control-Allow-Origin', reqOrigin);
  }
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.sendStatus(204);
});

// Always include credentials header (some clients rely on it)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ------------- Session store & cookie ------------------------
const cookieConfig = IS_PROD
  ? { httpOnly: true, secure: true, sameSite: 'none', maxAge: 24 * 60 * 60 * 1000 }
  : { httpOnly: true, secure: false, sameSite: 'lax',  maxAge: 24 * 60 * 60 * 1000 };

app.use(
  session({
    name: 'sid', // explicit cookie name
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    rolling: true, // refresh expiry on activity
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      dbName: 'heston_auth',
      collectionName: 'sessions',
    }),
    cookie: cookieConfig,
  })
);

// -------------- Routes --------------------------------------
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/health', (_req, res) => res.json({ ok: true, env: NODE_ENV }));
app.get('/test-cookie', (req, res) => {
  res.cookie('x_test', '1', { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' });
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dvla', dvlaRoutes);
app.use(appraisalsRouter); // ⬅️ VERY IMPORTANT

// ------------- 404 Helper -----------------------------------
app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// -------------- Server --------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT} [${NODE_ENV}]`);
});
