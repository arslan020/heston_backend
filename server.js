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
import appraisalsRouter from './routes/appraisals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// --- DB ----------------------------------------------------------------------
await connectDB(process.env.MONGO_URI);

// (optional) seed admin (dev safety)
(async () => {
  try {
    const existing = await Admin.findOne({ username: 'admin' });
    if (!existing) {
      const passwordHash = await bcrypt.hash('1234', 10);
      await Admin.create({ username: 'admin', passwordHash });
      console.log('👑 Seeded default admin: admin / 1234');
    }
  } catch (e) {
    console.warn('Admin seed skipped:', e.message);
  }
})();

// --- Parsers -----------------------------------------------------------------
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// --- CORS (Safari-friendly) --------------------------------------------------
// Set your production frontend here or via CLIENT_ORIGIN in .env
const FRONTEND_ORIGIN = process.env.CLIENT_ORIGIN || 'https://appraise.hestonautomotive.com';

const corsOptions = {
  origin: [ 'http://localhost:3000', 'https://heston-app-henh.vercel.app', FRONTEND_ORIGIN ],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Explicitly answer ALL preflights with 204 (iOS Safari can be strict)
app.options('*', cors(corsOptions));

// Optional: small helper to always include the credentials header
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  next();
});

// --- Logs --------------------------------------------------------------------
app.use(morgan('dev'));

// --- Sessions (Safari / proxy safe) -----------------------------------------
app.set('trust proxy', 1); // required for Secure cookies behind a proxy (Render/NGINX/etc)

app.use(session({
  // name: 'sid', // keep default 'connect.sid' unless you also update your logout code
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: 'heston_auth',
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7, // 7 days
  }),
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax', // REQUIRED for cross-site on iOS Safari
    secure:   isProd ? true    : false, // must be true when SameSite=None
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    // If API and FE are on different subdomains (e.g., api.heston... + appraise.heston...):
    // uncomment the next line so the cookie is valid across subdomains:
    // domain: '.hestonautomotive.com',
  },
}));

// --- Routes ------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dvla', dvlaRoutes);
app.use(appraisalsRouter); // appraisals router already prefixes /api/appraisals

app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 debug helper
app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found' });
});

// --- Server ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN) console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
});
