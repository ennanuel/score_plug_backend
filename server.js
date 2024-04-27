const mongoose = require("mongoose");

const { app, io, server } = require('./app');

// The express is declared in a different file to fix jest exit error when testing.

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
            socket.on('group-action', (params, type) => memberActions({ ...params, type, socket, io }))
        });
    }))
    .catch((err) => console.log(err));