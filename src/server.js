require('dotenv').config();
const express = require('express');
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
      'http://localhost:5173',
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

app.use('/api/auth', authRouter);
app.use('/api', apiRoutes);

app.use(errorHandler);

// Manejo de errores globales para detectar por qué el proceso podría cerrarse
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
if (!isVercel) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
// Export the app for Vercel
module.exports = app;
