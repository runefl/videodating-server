const express = require('express');
const app = express();
const http = require('http').createServer(app);

// VIKTIG: Legger til CORS slik at Blogger (videodating.no) 
// får lov til å koble seg til denne Render-serveren i bakgrunnen.
const io = require('socket.io')(http, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// En enkel tekst for å sjekke at serveren kjører hvis du går direkte på Render-linken
app.get('/', (req, res) => {
    res.send('Videodating WebRTC Server kjører usynlig i bakgrunnen! 🚀');
});

// --- SMART MATCHMAKING SERVER ---
let queue = [];
const bannedIPs = new Set();
const VIP_PASSWORD = "NORGE2026"; // Passordet ligger trygt her

io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.request.connection?.remoteAddress;

    if (bannedIPs.has(clientIp)) {
        socket.emit('banned');
        socket.disconnect(true);
        return;
    }
    socket.ip = clientIp;

    socket.on('check_vip_code', (code) => {
        if (code === VIP_PASSWORD) {
            socket.emit('vip_success');
        } else {
            socket.emit('vip_error');
        }
    });

    socket.on('find_match', (prefs) => {
        cleanupMatch(socket);
        queue = queue.filter(u => u.id !== socket.id);

        socket.gender = prefs.gender;

        let matchIndex = queue.findIndex(u => u.gender !== socket.gender);

        if (matchIndex !== -1) {
            const partner = queue.splice(matchIndex, 1)[0];
            
            socket.currentPartner = partner.id;
            partner.currentPartner = socket.id;
            socket.wantsMoreTime = false;
            partner.wantsMoreTime = false;

            socket.emit('match_found', { initiator: true, partnerId: partner.id });
            partner.emit('match_found', { initiator: false, partnerId: socket.id });
        } else {
            queue.push(socket);
        }
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signalData: data.signalData });
    });

    socket.on('add_time', () => {
        socket.wantsMoreTime = true;
        if (socket.currentPartner) {
            const partnerSocket = io.sockets.sockets.get(socket.currentPartner);
            if (partnerSocket && partnerSocket.wantsMoreTime) {
                io.to(socket.id).emit('time_added');
                io.to(socket.currentPartner).emit('time_added');
                socket.wantsMoreTime = false;
                partnerSocket.wantsMoreTime = false;
            }
        }
    });

    socket.on('report_user', () => {
        if (socket.currentPartner) {
            const partnerSocket = io.sockets.sockets.get(socket.currentPartner);
            if (partnerSocket) {
                bannedIPs.add(partnerSocket.ip);
                partnerSocket.emit('banned');
                partnerSocket.disconnect(true);
            }
        }
        cleanupMatch(socket);
        socket.emit('partner_left');
    });

    socket.on('disconnect', () => {
        queue = queue.filter(u => u.id !== socket.id);
        cleanupMatch(socket);
    });

    function cleanupMatch(sock) {
        if (sock.currentPartner) {
            io.to(sock.currentPartner).emit('partner_left');
            const partnerSocket = io.sockets.sockets.get(sock.currentPartner);
            if (partnerSocket) {
                partnerSocket.currentPartner = null;
                partnerSocket.wantsMoreTime = false;
            }
            sock.currentPartner = null;
            sock.wantsMoreTime = false;
        }
    }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 Hetero-Match Server live på port ${PORT}`);
});
