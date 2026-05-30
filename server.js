
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Forteller serveren at app-designet ligger i mappen "public"
app.use(express.static('public'));

let queue = [];
const bannedIPs = new Set(); // Lagrer IP-adresser til blokkerte brukere

io.on('connection', (socket) => {
    // Henter brukerens IP-adresse (fungerer også gjennom skytjenester)
    const clientIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.request.connection?.remoteAddress;

    // Sjekker om brukeren er utestengt
    if (bannedIPs.has(clientIp)) {
        socket.emit('banned');
        socket.disconnect(true);
        return;
    }

    socket.ip = clientIp;

    socket.on('find_match', () => {
        cleanupMatch(socket);
        
        // Fjern brukeren fra køen for sikkerhets skyld (unngår duplikater)
        queue = queue.filter(u => u.id !== socket.id);

        if (queue.length > 0) {
            // Match funnet! Spleis dem umiddelbart.
            const partner = queue.shift();
            socket.currentPartner = partner.id;
            partner.currentPartner = socket.id;

            socket.wantsMoreTime = false;
            partner.wantsMoreTime = false;

            socket.emit('match_found', { initiator: true, partnerId: partner.id });
            partner.emit('match_found', { initiator: false, partnerId: socket.id });
        } else {
            // Sett i kø
            queue.push(socket);
        }
    });

    // Sender videosignalene (WebRTC) mellom brukerne
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signalData: data.signalData });
    });

    // "Legg til tid"-logikk
    socket.on('add_time', () => {
        socket.wantsMoreTime = true;
        if (socket.currentPartner) {
            const partnerSocket = io.sockets.sockets.get(socket.currentPartner);
            if (partnerSocket && partnerSocket.wantsMoreTime) {
                // Begge har trykket på "legg til tid"
                io.to(socket.id).emit('time_added');
                io.to(socket.currentPartner).emit('time_added');
                socket.wantsMoreTime = false;
                partnerSocket.wantsMoreTime = false;
            } else {
                // Bare én har trykket, si ifra til den andre
                io.to(socket.currentPartner).emit('partner_wants_time');
            }
        }
    });

    // Rapporter og utesteng bruker
    socket.on('report_user', () => {
        if (socket.currentPartner) {
            const partnerSocket = io.sockets.sockets.get(socket.currentPartner);
            if (partnerSocket) {
                bannedIPs.add(partnerSocket.ip); // Svartelist IP-en permanent
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

    // Funksjon for å rydde opp trygt når noen skipper eller legger på
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
    console.log(`🚀 Profesjonell Server kjører på port ${PORT}`);
});
