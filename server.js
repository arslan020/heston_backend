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
import appraisalsRouter from './routes/appraisals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- Security/Headers (optional) ---------------
app.disable('x-powered-by');

// ---------------- DB ----------------------------------------
await connectDB(process.env.MONGO_URI);

// (optional) seed admin
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

// ✅ CORS config (consolidated)
const allowedOrigins = new Set([
  'http://localhost:3000',
  'https://appraise.hestonautomotive.com',
  process.env.CLIENT_ORIGIN, // keep env too
].filter(Boolean));

app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin tools (e.g., curl/postman without Origin)
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204,
}));

// Preflight for all routes
app.options('*', cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// logs
app.use(morgan('dev'));

// sessions
// ✅ Trust proxy required for Render & Safari secure cookies
app.set('trust proxy', 1);

// ✅ Express-session config (Safari-safe)
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: 'heston_auth',
    collectionName: 'sessions',
  }),
  cookie: {
    httpOnly: true,
    secure: true,           // ✅ must be true for HTTPS
    sameSite: 'none',       // ✅ allow cross-site cookies (Safari fix)
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));


// Ensure credentials header is always present on API responses (helps some clients)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// -------------- Routes --------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dvla', dvlaRoutes);
app.use(appraisalsRouter); // ⬅️ VERY IMPORTANT

// Simple root route (added as per summary)
app.get('/', (req, res) => res.status(200).send('OK'));

// Optional test route for cookie testing
app.get('/test-cookie', (req, res) => {
  res.cookie('x_test', '1', { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// ------------- 404 Helper -----------------------------------
app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
