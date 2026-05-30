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
        
        /* Premium Animert Kode-bakgrunn */
        body { 
            background: linear-gradient(-45deg, #0d0d12, #1a1a24, #0b130e, #000000);
            background-size: 400% 400%;
            animation: gradientBG 15s ease infinite;
            color: white; 
            height: 100dvh; 
            overflow: hidden; 
            display: flex; 
            flex-direction: column; 
        }

        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        /* Overlays (Velkomst, Info, Betaling) */
        .overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.4); z-index: 100; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; overflow-y: auto; backdrop-filter: blur(8px); }
        .box { background: rgba(17, 17, 17, 0.85); padding: 30px; border-radius: 20px; border: 1px solid #333; max-width: 420px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.9); margin: auto; }
        .box h1 { color: #58cc02; margin-bottom: 15px; font-size: 26px; }
        .box p { font-size: 15px; color: #ccc; margin-bottom: 20px; line-height: 1.5; }
        
        /* Kjønn-velger Design */
        .gender-section { background: rgba(26, 26, 26, 0.8); padding: 15px; border-radius: 15px; margin-bottom: 20px; text-align: left; border: 1px solid #333; }
        .gender-section p.title { font-size: 14px; font-weight: bold; color: #aaa; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; text-align: center;}
        .g-btn-group { display: flex; gap: 8px; }
        .g-btn { flex: 1; padding: 15px 5px; background: #222; color: #fff; border: 2px solid #444; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px; transition: 0.2s; }
        .g-btn.active { border-color: #58cc02; background: rgba(88,204,2,0.15); color: #58cc02; }
        
        /* Knapper */
        .btn-primary { background: #58cc02; color: #000; font-weight: bold; border: none; padding: 16px 30px; border-radius: 30px; font-size: 18px; cursor: pointer; width: 100%; margin-bottom: 10px; transition: transform 0.1s;}
        .btn-primary:active { transform: scale(0.95); }
        .btn-info { background: transparent; color: #aaa; border: none; font-size: 15px; cursor: pointer; margin-top: 15px; text-decoration: underline; padding: 10px; }
        
        .btn-vip { background: linear-gradient(45deg, #635bff, #00d4ff); color: white; font-weight: bold; border: none; padding: 15px 30px; border-radius: 30px; font-size: 18px; cursor: pointer; width: 100%; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(99, 91, 255, 0.4); transition: transform 0.1s;}
        .btn-vip:active { transform: scale(0.95); }
        .vip-input { width: 100%; padding: 15px; border-radius: 10px; border: none; font-size: 18px; text-align: center; margin-bottom: 15px; outline: none; background: #222; color: white; border: 1px solid #444;}
        .hidden { display: none !important; }
        
        /* Infoboks liste */
        .info-list { text-align: left; color: #ccc; font-size: 15px; margin-bottom: 25px; line-height: 1.6; }
        .info-list p { margin-bottom: 15px; }
        .info-list span { font-size: 22px; margin-right: 10px; vertical-align: middle; }

        /* Hoveddesign app */
        .header { position: absolute; top: 0; width: 100%; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 20; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent); }
        .logo { font-size: 20px; font-weight: 800; color: #58cc02; }
        #matchCounter { color: #aaa; font-size: 14px; font-weight: bold; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 10px; }
        #reportBtn { background: rgba(255, 59, 48, 0.8); border: none; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; display: none; }

        .video-container { position: relative; flex: 1; display: flex; justify-content: center; align-items: center; }
        #remoteVideo { width: 100%; height: 100%; object-fit: cover; background: transparent; }
        #localVideo { position: absolute; bottom: 120px; right: 20px; width: 100px; height: 150px; object-fit: cover; border-radius: 12px; border: 2px solid white; transform: scaleX(-1); background: #222; z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        
        #timer { position: absolute; top: 70px; left: 20px; font-size: 40px; font-weight: 900; text-shadow: 0 2px 10px black; z-index: 10; display: none; }
        #status { position: absolute; background: rgba(0,0,0,0.6); padding: 20px 30px; border-radius: 15px; font-size: 16px; font-weight: bold; z-index: 30; text-align: center; line-height: 1.4; backdrop-filter: blur(8px); }

        .controls { position: absolute; bottom: 0; width: 100%; padding: 20px; display: flex; gap: 15px; justify-content: center; z-index: 20; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
        .action-btn { flex: 1; padding: 18px 0; font-size: 18px; font-weight: bold; border: none; border-radius: 30px; cursor: pointer; color: white; max-width: 250px; transition: transform 0.1s;}
        .action-btn:active { transform: scale(0.95); }
        #startBtn { background: #58cc02; color: black; display: none; }
        #skipBtn { background: #ff3b30; display: none; }
        #timeBtn { background: #ffcc00; color: #000; display: none; }
    </style>
</head>
<body>

    <div id="ageOverlay" class="overlay">
        <div class="box">
            <h1 style="color: white; font-size: 26px;">Velkommen 👋</h1>
            <p style="font-size: 14px; margin-bottom: 20px;">Velg kjønn for å finne den perfekte matchen.</p>
            
            <div class="gender-section">
                <p class="title">Jeg er:</p>
                <div class="g-btn-group">
                    <button id="g-M" class="g-btn active" onclick="setGender('M')">Mann</button>
                    <button id="g-F" class="g-btn" onclick="setGender('F')">Kvinne</button>
                </div>
            </div>

            <p style="font-size: 13px; color:#888;">Live video-tjeneste med 18-årsgrense. Upassende adferd fører til permanent utestengelse.<br><br><span style="color: #ffcc00;">NB: VIP-betaling testes. Du får 25 gratis chatter!</span></p>
            
            <button class="btn-primary" onclick="acceptAge()">Godta (18+) & Start Appen</button>
            <button class="btn-info" onclick="toggleInfo(true)">📖 Skeptisk? Slik fungerer siden</button>
        </div>
    </div>

    <div id="infoOverlay" class="overlay hidden" style="z-index: 150;">
        <div class="box" style="max-width: 450px;">
            <h1 style="color:#58cc02; margin-bottom: 25px;">Slik fungerer det 💡</h1>
            
            <div class="info-list">
                <p><span>🔒</span> <b>100% Anonymt & Trygt:</b> Vi ber ikke om navn. Video går direkte mellom telefonene (Peer-to-Peer). Ingenting lagres noensinne hos oss.</p>
                <p><span>🎯</span> <b>Smart Match:</b> Menn kobles automatisk med kvinner, og kvinner med menn.</p>
                <p><span>⏱</span> <b>15 Sekunder:</b> Finner dere tonen? Hvis BEGGE trykker "➕ Tid", forlenges samtalen!</p>
                <p><span>⏭</span> <b>Skip:</b> Er det ikke en match? Trykk "Skip" for å lynraskt hoppe videre.</p>
                <p><span>🚨</span> <b>Nulltoleranse:</b> Føler du deg utrygg? Trykk "Rapporter". Brukeren utestenges da permanent fra plattformen.</p>
            </div>
            
            <button class="btn-primary" onclick="toggleInfo(false)">Skjønner! Ta meg tilbake</button>
        </div>
    </div>

    <div id="paywallOverlay" class="overlay hidden">
        <div class="box">
            <h1 style="color: #00d4ff;">💎 VIP Tilgang</h1>
            <p>Du har brukt opp dine 25 gratis chatter. Betalingsløsningen er for øyeblikket i testfase. Vennligst kom tilbake senere!</p>
            
            <button class="btn-vip" style="opacity: 0.6;" onclick="alert('Betalingssystemet er under testing. Kom tilbake senere for å kjøpe VIP!')">💳 Kjøp VIP (Kommer snart)</button>
            <p style="font-size: 12px; color: #888; margin-bottom: 20px;">Passordet for å låse opp appen vises på kvitteringen etter at du har betalt.</p>
            
            <hr style="border: 1px solid #333; margin: 20px 0;">
            <p style="font-size: 14px; margin-bottom: 10px;">Har du allerede passordet?</p>
            <input type="text" id="vipCodeInput" class="vip-input" placeholder="Skriv inn passord..." autocomplete="off" />
            <button class="btn-primary" style="background: #333; color: white;" onclick="checkVip()">Lås opp appen</button>
            <p id="vipError" style="color: #ff3b30; display: none; margin-top: 10px;">Feil passord!</p>
        </div>
    </div>

    <div class="header">
        <div class="logo">Videodating</div>
        <div id="matchCounter" class="hidden">Gratis: 25</div>
        <button id="reportBtn">🚨 Rapporter</button>
    </div>

    <div class="video-container">
        <div id="status">Klar til å finne noen?</div>
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
        // GLOBALE VARIABLER (Standardvalg: Mann)
        let myGender = 'M';

        // Laster inn gratis-chatter og VIP-status
        let freeMatchesLeft = localStorage.getItem('freeMatches25');
        if (freeMatchesLeft === null) freeMatchesLeft = 25;
        else freeMatchesLeft = parseInt(freeMatchesLeft);
        let isVIP = localStorage.getItem('isVIP') === 'true';

        // UI FUNKSJONER (Kjønnsvalg)
        function setGender(val) {
            myGender = val;
            document.getElementById('g-M').classList.remove('active');
            document.getElementById('g-F').classList.remove('active');
            document.getElementById('g-' + val).classList.add('active');
        }

        // Husker valget hvis man har vært på nettsiden før!
        if (localStorage.getItem('myGender')) setGender(localStorage.getItem('myGender'));

        function toggleInfo(show) {
            if(show) document.getElementById('infoOverlay').classList.remove('hidden');
            else document.getElementById('infoOverlay').classList.add('hidden');
        }

        function acceptAge() {
            // Lagre kjønnsvalget i nettleseren for fremtiden
            localStorage.setItem('myGender', myGender);

            document.getElementById('ageOverlay').classList.add('hidden');
            document.getElementById('startBtn').style.display = 'block';
            if(!isVIP) document.getElementById('matchCounter').innerText = "Gratis igjen: " + freeMatchesLeft;
        }

        function checkVip() {
            if (document.getElementById('vipCodeInput').value.toUpperCase().trim() === "NORGE2026") {
                localStorage.setItem('isVIP', 'true');
                isVIP = true;
                document.getElementById('paywallOverlay').classList.add('hidden');
                ui.matchCounter.innerText = "💎 VIP";
                ui.matchCounter.style.color = "#00d4ff";
                finnMatch();
            } else {
                document.getElementById('vipError').style.display = 'block';
            }
        }

        // WEBRTC & SOCKET LOGIKK
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
                
                if (isVIP) {
                    ui.matchCounter.innerText = "💎 VIP";
                    ui.matchCounter.style.color = "#00d4ff";
                }
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
                localStorage.setItem('freeMatches25', freeMatchesLeft);
                ui.matchCounter.innerText = "Gratis igjen: " + freeMatchesLeft;
            }

            // Hvem leter vi etter? (Motsatt av hva du er)
            let leterEtterTekst = (myGender === 'M') ? 'kvinne' : 'mann';

            ui.status.innerHTML = "Leter etter en " + leterEtterTekst + " til deg... 🔍";
            ui.status.style.display = "block";
            ui.skipBtn.style.display = "none";
            ui.timeBtn.style.display = "none";
            ui.reportBtn.style.display = "none";
            
            // Sender valget til serveren for matchmaking
            socket.emit('find_match', { gender: myGender });
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
            ui.status.innerText = "Partner hoppet videre.";
            ui.status.style.display = "block";
            setTimeout(finnMatch, 800);
        });

        socket.on('banned', () => {
            avsluttTilkobling();
            ui.status.innerHTML = "<h2 style='color:#ff3b30;'>Utestengt</h2><p>Din IP-adresse er permanent blokkert pga. regelbrudd.</p>";
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

// Tvinger serveren til å sende app-designet uansett hva
app.get('*', (req, res) => {
    res.send(APP_HTML);
});

// --- SMART MATCHMAKING SERVER (KUN HETERO-MATCHING) ---
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

    // Når en bruker trykker "Søk etter match"
    socket.on('find_match', (prefs) => {
        cleanupMatch(socket);
        queue = queue.filter(u => u.id !== socket.id);

        // Lagrer hvem de er
        socket.gender = prefs.gender; // 'M' eller 'F'

        // Finn en partner i køen av motsatt kjønn
        let matchIndex = queue.findIndex(u => u.gender !== socket.gender);

        if (matchIndex !== -1) {
            // Vi fant en match! Plukk dem ut av køen
            const partner = queue.splice(matchIndex, 1)[0];
            
            socket.currentPartner = partner.id;
            partner.currentPartner = socket.id;
            socket.wantsMoreTime = false;
            partner.wantsMoreTime = false;

            socket.emit('match_found', { initiator: true, partnerId: partner.id });
            partner.emit('match_found', { initiator: false, partnerId: socket.id });
        } else {
            // Ingen av motsatt kjønn ledig akkurat nå. Setter i køen.
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
