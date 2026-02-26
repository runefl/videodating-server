const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let waitingUser = null; 

io.on('connection', (socket) => {
    socket.on('find-partner', (peerId) => {
        socket.peerId = peerId;
        if (waitingUser && waitingUser.id !== socket.id) {
            console.log('Match funnet!');
            waitingUser.emit('call-partner', peerId);
            waitingUser = null; 
        } else {
            waitingUser = socket;
            socket.emit('waiting');
        }
    });

    socket.on('next', () => {
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null; 
        }
        socket.broadcast.emit('partner-left');
    });

    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
        socket.broadcast.emit('partner-left');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Matchmaking-server kjører på port ' + PORT);
});
