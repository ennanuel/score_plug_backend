const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bp = require('body-parser');
const { graphqlHTTP } = require('express-graphql');

const authRoute = require('./src/routes/auth');
const teamRoute = require('./src/routes/team');
const compRoute = require('./src/routes/competition');
const playerRoute = require('./src/routes/player');
const matchRoute = require('./src/routes/match');
const searchRoute = require('./src/routes/search');
const maintenanceRoute = require('./src/routes/maintenance');

const schema = require('./src/routes/schema');

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL
    })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use('/images', express.static("images"));
app.use('/maintenance', maintenanceRoute);
app.use('/api/v2/auth', authRoute);
app.use('/api/v2/team', teamRoute);
app.use('/api/v2/competition', compRoute);
app.use('/api/v2/player', playerRoute);
app.use('/api/v2/match', matchRoute);
app.use('/api/v2/search', searchRoute);

app.use('/graphql', graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV == 'development'
}))

module.exports = app;