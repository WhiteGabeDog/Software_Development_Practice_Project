const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config({path: './config/config.env'});

// Route files
const auth = require('./routes/auth');
const coworkingSpace = require('./routes/coworkingspace');
const appointments = require('./routes/appointments');
const adminRoutes = require('./routes/admin');

//Connect to database
connectDB();

const app = express();
app.use(express.json());

//Mount routers
app.use('/api/v1/auth',auth);
app.use('/api/v1/coworkingspaces',coworkingSpace);
app.use('/api/v1/appointments',appointments);
app.use('/api/v1/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(
    PORT,
    console.log('Server running in ',process.env.NODE_ENV, 'mode on port ',PORT)
);

// To console the error message
process.on('unhandledRejection',(err,promise) => {
    console.log(`Error: ${err.message}`);

    server.close(()=>process.exit(1));
});