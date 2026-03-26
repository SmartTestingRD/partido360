require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const authRouter = require('./routes/authRoute');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
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
