const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config({path: './config/config.env'});

