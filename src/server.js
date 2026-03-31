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
    const allowedOrigins = [
      'https://*.smarttestingrd.vercel.app',
      'https://partido360-git-devops-smarttestingrd.vercel.app',
      'https://partido360.vercel.app',
      'https://dev.political360.online',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    // Permitir requests sin origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS: ' + origin));
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

const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
if (!isVercel) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
// Export the app for Vercel
module.exports = app;
