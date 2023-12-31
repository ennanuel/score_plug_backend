const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const bp = require('body-parser')
const mongoose = require('mongoose')

const authRoute = require('./routes/auth');
const teamRoute = require('./routes/team');
const compRoute = require('./routes/competition');
const playerRoute = require('./routes/player');
const matchRoute = require('./routes/match');
const searchRoute = require('./routes/search');
const maintenanceRoute = require('./routes/maintenance');

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
app.use('/auth', authRoute);
app.use('/team', teamRoute);
app.use('/competition', compRoute);
app.use('/player', playerRoute);
app.use('/match', matchRoute);
app.use('/search', searchRoute);

const startServer = (port) => app.listen(port || 4000, () => console.log('Server running...'));

mongoose.set('strictQuery', false);

mongoose
    .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => startServer(process.env.PORT))
    .catch((err) => console.log(err));