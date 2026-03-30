require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const negociosRoutes = require('./routes/negocios');
const turnosRoutes   = require('./routes/turnos');
const pagosRoutes    = require('./routes/pagos');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Seguridad ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

// Rate limit global: 100 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limit estricto solo para auth: 10 intentos / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos, espera 15 minutos' },
});

// ─── Rutas ────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/turnos',   turnosRoutes);
app.use('/api/pagos',    pagosRoutes);

// ─── Health check ────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'TurnosYa API funcionando' });
});

// ─── Ruta no encontrada ───────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Iniciar servidor ────────────────────────
app.listen(PORT, () => {
  console.log(`TurnosYa API corriendo en http://localhost:${PORT}`);
  console.log(`BACKEND_URL: ${process.env.BACKEND_URL || 'no configurado'}`);
});
