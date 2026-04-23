require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const authRouter = require('./routes/authRoute');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Dominios permitidos exactos
    const allowedOrigins = [
      'https://partido360-git-devops-smarttestingrd.vercel.app',
      'https://partido360.vercel.app',
      'https://dev.political360.online',
      'https://political360.online',
      'https://www.political360.online',
      'https://partido360-frontend.smarttesting.com.do',
      'https://partido360-api.smarttesting.com.do',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

    // Permitir cualquier subdominio de vercel.app, political360.online y smarttesting.com.do
    const allowedPatterns = [
      /\.vercel\.app$/,
      /\.netlify\.app$/,
      /\.political360\.online$/,
      /political360\.online$/,
      /\.smarttesting\.com\.do$/,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ];

    const isAllowed = allowedOrigins.includes(origin) ||
                      allowedPatterns.some(pattern => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('[CORS] Origen bloqueado:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());

// Main prefixed paths
app.use('/api/auth', authRouter);
app.use('/api', apiRoutes);

// Fallback paths for when reverse proxies (e.g. Traefik in Coolify)
// strip the `/api` prefix from the URL before it reaches Node.
app.use('/auth', authRouter);
app.use('/', apiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'partido360-backend',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files in monolith (nixpacks) deploy mode
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(errorHandler);

// Manejo de errores globales para detectar por qué el proceso podría cerrarse
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

// Health check endpoints for Traefik or direct browser access
app.get('/', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV, message: 'Backend is running' }));
app.get('/api', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV, message: 'API is running' }));

const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
if (!isVercel) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
// Export the app for Vercel
module.exports = app;
