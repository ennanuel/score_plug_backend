const mongoose = require("mongoose");
const { graphqlHTTP } = require('express-graphql');
const express = require('express');
const cors = require('cors');
const bp = require('body-parser');
const dotenv = require('dotenv');

const maintenanceRoute = require('./src/routes/maintenance');
const scheduleRoute = require('./src/routes/schedule');
const schema = require('./src/routes/schema');

const { app, io, server } = require('./app');

dotenv.config();

app.use(
    cors({
        origin: process.env.FRONTEND_URL
    })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use('/', express.static("public"));
app.use('/schedule', scheduleRoute);
app.use('/maintenance', maintenanceRoute);

app.use('/graphql', graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV == 'dev'
}));

mongoose.set('strictQuery', false);

mongoose
    .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => server.listen(process.env.PORT, () => {
        console.log('server running on port %s', process.env.PORT);

        io.on("connection", (socket) => {
            console.log('Socket connected: %s', socket.id);
        });
    }))
    .catch((err) => console.log(err));