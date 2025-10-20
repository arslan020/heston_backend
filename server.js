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

// ---------------- DB ----------------
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

// ------------- Parsers --------------
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ------------- CORS -----------------
// Keep localhost (dev), Vercel app, and your custom subdomain.
// You can also supply CLIENT_ORIGIN via Render env; falsy values are filtered.
const allowedOrigins = [
  'http://localhost:3000',
  'https://heston-app-henh.vercel.app',
  'https://appraise.hestonautomotive.com',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Ensure credentials header is always present on API responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ------------- Logs -----------------
app.use(morgan('dev'));

// -------- Sessions / Cookies --------
// Required for secure cookies behind Render/NGINX
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax', // cross-site cookies for Vercel ↔ Render, incl. iOS/Safari
      secure: isProd,                    // HTTPS only in production
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      dbName: 'heston_auth',
      collectionName: 'sessions',
    }),
  })
);

// -------------- Routes --------------
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dvla', dvlaRoutes);
app.use(appraisalsRouter); // ⬅️ VERY IMPORTANT

app.get('/health', (_req, res) => res.json({ ok: true }));

// ------------- 404 Helper -----------
app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found' });
});

// -------------- Server --------------
app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
