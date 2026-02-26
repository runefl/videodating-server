const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 1. Tillat at videodating.no kobler seg til (CORS)
const io = new Server(server, {
    cors: {
        origin: ["https://videodating.no", "http://videodating.no", "https://www.videodating.no"],
        methods: ["GET", "POST"]
    }
});

// 2. Fjern "Cannot GET /" ved å legge til denne ruten
app.get('/', (req, res) => {
    res.send('Videodating Signal Server er oppe og kjører!');
});

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('Bruker koblet til:', socket.id);

    socket.on('find-partner', (myPeerId) => {
        if (waitingUser && waitingUser.id !== socket.id) {
            io.to(waitingUser.id).emit('call-partner', myPeerId);
            socket.partner = waitingUser;
            waitingUser.partner = socket;
            waitingUser = null;
        } else {
            waitingUser = socket;
            socket.emit('waiting');
        }
    });

    socket.on('next', () => {
        if (socket.partner) {
            socket.partner.emit('partner-left');
            socket.partner.partner = null;
            socket.partner = null;
        }
    });

    socket.on('disconnect', () => {
        if (socket.partner) {
            socket.partner.emit('partner-left');
            socket.partner.partner = null;
        }
        if (waitingUser === socket) waitingUser = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server kjører på port ${PORT}`);
});
