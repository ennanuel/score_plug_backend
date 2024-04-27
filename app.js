const express = require('express');
const dotenv = require('dotenv');

const http = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

dotenv.config();

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL
    }
})

module.exports = { io, server, app };