const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// --- HELE APPEN I ÉN FIL ---
const APP_HTML = `
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Videodating</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
        body { background-color: #000; color: white; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
        
        /* 18+ og Betalingsmur */
        .overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); z-index: 100; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; }
        .box { background: #111; padding: 30px; border-radius: 20px; border: 1px solid #333; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
        .box h1 { color: #ff3b30; margin-bottom: 15px; font-size: 24px; }
        .box p { font-size: 16px; color: #ccc; margin-bottom: 25px; line-height: 1.5; }
        .btn-primary { background: #58cc02; color: #000; font-weight: bold; border: none; padding: 15px 30px; border-radius: 30px; font-size: 18px; cursor: pointer; width: 100%; margin-bottom: 10px; }
        .btn-vip { background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; font-weight: bold; border: none; padding: 15px 30px; border-radius: 30px; font-size: 18px; cursor: pointer; width: 100%; margin-bottom: 10px; }
        .vip-input { width: 100%; padding: 15px; border-radius: 10px; border: none; font-size: 18px; text-align: center; margin-bottom: 15px; outline: none; }
        .hidden { display: none !important; }

        /* Hoveddesign app */
        .header { position: absolute; top: 0; width: 100%; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 20; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); }
        .logo { font-size: 20px; font-weight: 800; color: #58cc02; }
        #matchCounter { color: #aaa; font-size: 14px; font-weight: bold; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 10px; }
        #reportBtn { background: rgba(255, 59, 48, 0.8); border: none; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; display: none; }

        .video-container { position: relative; flex: 1; display: flex; justify-content: center; align-items: center; }
        #remoteVideo { width: 100%; height: 100%; object-fit: cover; background: #111; }
        #localVideo { position: absolute; bottom: 120px; right: 20px; width: 100px; height: 150px; object-fit: cover; border-radius: 12px; border: 2px solid white; transform: scaleX(-1); background: #222; z-index: 10; }
        
        #timer { position: absolute; top: 70px; left: 20px; font-size: 40px; font-weight: 900; text-shadow: 0 2px 10px black; z-index: 10; display: none; }
        #status { position: absolute; background: rgba(0,0,0,0.8); padding: 20px 30px; border-radius: 15px; font-size: 18px; font-weight: bold; z-index: 30; }

        .controls { position: absolute; bottom: 0; width: 100%; padding: 20px; display: flex; gap: 15px; justify-content: center; z-index: 20; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); }
        .action-btn { flex: 1; padding: 18px 0; font-size: 18px; font-weight: bold; border: none; border-radius: 30px; cursor: pointer; color: white; max-width: 250px; }
        #startBtn { background: #58cc02; color: black; display: none; }
        #skipBtn { background: #ff3b30; display: none; }
        #timeBtn { background: #ffcc00; color: #000; display: none; }
    </style>
</head>
<body>

    <div id="ageOverlay" class="overlay">
        <div class="box">
            <h1>🔞 18-Årsgrense</h1>
            <p>Dette er en live video-tjeneste. Du må være over 18 år for å bruke den. Upassende adferd fører til permanent utestengelse.</p>
            <button class="btn-primary" onclick="acceptAge()">Jeg er over 18 år</button>
        </div>
    </div>

    <div id="paywallOverlay" class="overlay hidden">
        <div class="box">
            <h1 style="color: #FFD700;">💎 VIP Tilgang</h1>
            <p>Du har brukt opp dine 3 gratis chatter. For å fortsette ubegrenset, må du ha et VIP-passord.</p>
            
            <button class="btn-vip" onclick="alert('Vipps 99 kr til DITT_NUMMER_HER for å få passordet tilsendt!')">1. Kjøp VIP (Vipps)</button>
            
            <hr style="border: 1px solid #333; margin: 20px 0;">
            <p style="font-size: 14px; margin-bottom: 10px;">Har du passordet?</p>
            <input type="text" id="vipCodeInput" class="vip-input" placeholder="Skriv inn passord..." />
            <button class="btn-primary" onclick="checkVip()">2. Lås opp appen</button>
            <p id="vipError" style="color: #ff3b30; display: none; margin-top: 10px;">Feil passord!</p>
        </div>
    </div>

    <div class="header">
        <div class="logo">Videodating</div>
        <div id="matchCounter" class="hidden">Gratis: 3</div>
        <button id="reportBtn">🚨 Rapporter</button>
    </div>

    <div class="video-container">
        <div id="status">Godkjenn kamera for å starte</div>
        <video id="remoteVideo" autoplay playsinline></video>
        <video id="localVideo" autoplay playsinline muted></video>
        <div id="timer">15</div>
    </div>

    <div class="controls">
        <button id="startBtn" class="action-btn">Start Kamera</button>
        <button id="skipBtn" class="action-btn">⏭ Skip</button>
        <button id="timeBtn" class="action-btn">➕ Tid</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        // Laster inn lagrede data
        let freeMatchesLeft = localStorage.getItem('freeMatches');
        if (freeMatchesLeft === null) freeMatchesLeft = 3;
        else freeMatchesLeft = parseInt(freeMatchesLeft);
        
        let isVIP = localStorage.getItem('isVIP') === 'true';

        function acceptAge() {
            document.getElementById('ageOverlay').classList.add('hidden');
            document.getElementById('startBtn').style.display = 'block';
        }

        function checkVip() {
            // DETTE ER PASSORDET DU GIR TIL DE SOM HAR BETALT:
            if (document.getElementById('vipCodeInput').value.toUpperCase().trim() === "NORGE2026") {
                localStorage.setItem('isVIP', 'true');
                isVIP = true;
                document.getElementById('paywallOverlay').classList.add('hidden');
                finnMatch();
            } else {
                document.getElementById('vipError').style.display = 'block';
            }
        }

        const socket = io();
        let localStream, peerConnection, partnerId = null, timerInterval, timeLeft = 15, hasRequestedTime = false;

        const ui = {
            localVideo: document.getElementById('localVideo'), remoteVideo: document.getElementById('remoteVideo'),
            startBtn: document.getElementById('startBtn'), skipBtn: document.getElementById('skipBtn'),
            timeBtn: document.getElementById('timeBtn'), reportBtn: document.getElementById('reportBtn'),
            status: document.getElementById('status'), timer: document.getElementById('timer'),
            matchCounter: document.getElementById('matchCounter')
        };

        const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

        ui.startBtn.onclick = async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
                ui.localVideo.srcObject = localStream;
                ui.startBtn.style.display = 'none';
                ui.matchCounter.classList.remove('hidden');
                finnMatch();
            } catch (err) { alert("Du må tillate kamera og mikrofon for at appen skal fungere!"); }
        };

        ui.skipBtn.onclick = finnMatch;

        ui.timeBtn.onclick = () => {
            if (hasRequestedTime) return;
            socket.emit('add_time');
            hasRequestedTime = true;
            ui.timeBtn.innerText = "⏳ Venter";
            ui.timeBtn.style.opacity = "0.7";
        };

        ui.reportBtn.onclick = () => {
            if(confirm("Sikker på at du vil permanent utestenge denne brukeren for regelbrudd?")) {
                socket.emit('report_user');
                finnMatch();
            }
        };

        function finnMatch() {
            avsluttTilkobling();
            
            if (!isVIP && freeMatchesLeft <= 0) {
                document.getElementById('paywallOverlay').classList.remove('hidden');
                return;
            }
            if (!isVIP) {
                freeMatchesLeft--;
                localStorage.setItem('freeMatches', freeMatchesLeft);
                ui.matchCounter.innerText = "Gratis igjen: " + freeMatchesLeft;
            } else {
                ui.matchCounter.innerText = "💎 VIP";
                ui.matchCounter.style.color = "#FFD700";
            }

            ui.status.innerText = "Leter etter match... 🔍";
            ui.status.style.display = "block";
            ui.skipBtn.style.display = "none";
            ui.timeBtn.style.display = "none";
            ui.reportBtn.style.display = "none";
            socket.emit('find_match');
        }

        socket.on('match_found', async (data) => {
            partnerId = data.partnerId;
            ui.status.style.display = "none";
            ui.skipBtn.style.display = "block";
            ui.timeBtn.style.display = "block";
            ui.reportBtn.style.display = "block";
            hasRequestedTime = false;
            ui.timeBtn.innerText = "➕ Tid";
            ui.timeBtn.style.opacity = "1";

            peerConnection = new RTCPeerConnection(rtcConfig);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            peerConnection.ontrack = (event) => {
                ui.remoteVideo.srcObject = event.streams[0];
                startTimer(15);
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) socket.emit('signal', { to: partnerId, signalData: { type: 'ice', candidate: event.candidate } });
            };

            if (data.initiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('signal', { to: partnerId, signalData: offer });
            }
        });

        socket.on('signal', async (data) => {
            if (!peerConnection) return;
            if (data.signalData.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signalData));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('signal', { to: data.from, signalData: answer });
            } else if (data.signalData.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signalData));
            } else if (data.signalData.type === 'ice') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.signalData.candidate));
            }
        });

        socket.on('time_added', () => {
            timeLeft += 15;
            ui.timeBtn.innerText = "➕ Tid";
            ui.timeBtn.style.opacity = "1";
            hasRequestedTime = false;
        });

        socket.on('partner_left', () => {
            ui.status.innerText = "Partner hoppet over deg.";
            ui.status.style.display = "block";
            setTimeout(finnMatch, 800);
        });

        socket.on('banned', () => {
            avsluttTilkobling();
            ui.status.innerHTML = "<h2 style='color:#ff3b30;'>Utestengt</h2><p>Din IP-adresse er permanent blokkert.</p>";
            ui.status.style.display = "block";
            document.querySelector('.controls').style.display = 'none';
        });

        function startTimer(sekunder) {
            timeLeft = sekunder;
            ui.timer.style.display = 'block';
            ui.timer.innerText = timeLeft;
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeLeft--;
                ui.timer.innerText = timeLeft;
                if (timeLeft <= 5) ui.timer.style.color = "#ff3b30";
                else ui.timer.style.color = "white";
                if (timeLeft <= 0) finnMatch();
            }, 1000);
        }

        function avsluttTilkobling() {
            if (peerConnection) peerConnection.close();
            peerConnection = null;
            ui.remoteVideo.srcObject = null;
            partnerId = null;
            clearInterval(timerInterval);
            ui.timer.style.display = 'none';
        }
    </script>
</body>
</html>
`;

// Tvinger serveren til å sende app-designet uansett hva!
app.get('*', (req, res) => {
    res.send(APP_HTML);
});

// --- MATCHMAKING SERVER & SIKKERHET ---
let queue = [];
const bannedIPs = new Set();

io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.request.connection?.remoteAddress;

    if (bannedIPs.has(clientIp)) {
        socket.emit('banned');
        socket.disconnect(true);
        return;
    }
    socket.ip = clientIp;

    socket.on('find_match', () => {
        cleanupMatch(socket);
        queue = queue.filter(u => u.id !== socket.id);

        if (queue.length > 0) {
            const partner = queue.shift();
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
    console.log(`🚀 Server live på port ${PORT}`);
});
