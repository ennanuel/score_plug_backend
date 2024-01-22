const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const bp = require('body-parser')
const mongoose = require('mongoose')

const authRoute = require('./src/routes/auth');
const teamRoute = require('./src/routes/team');
const compRoute = require('./src/routes/competition');
const playerRoute = require('./src/routes/player');
const matchRoute = require('./src/routes/match');
const searchRoute = require('./src/routes/search');
const maintenanceRoute = require('./src/routes/maintenance');

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL
    })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use('/maintenance', maintenanceRoute);
app.use('/api/v2/auth', authRoute);
app.use('/api/v2/team', teamRoute);
app.use('/api/v2/competition', compRoute);
app.use('/api/v2/player', playerRoute);
app.use('/api/v2/match', matchRoute);
app.use('/api/v2/search', searchRoute);

const server = (port = 4000) => app.listen(port, () => console.log('Server running...'));

mongoose.set('strictQuery', false);

mongoose
    .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => server(process.env.PORT))
    .catch((err) => console.log(err));

module.exports = { app, server };