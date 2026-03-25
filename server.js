const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// تخزين اتصالات العملاء
const clients = new Set();

// منع السبام (3 رسائل كل 5 ثوانٍ لكل لاعب)
const spamTracker = new Map();
const SPAM_LIMIT = 3;
const SPAM_WINDOW_MS = 5000;

function isSpamming(playerName) {
    const now = Date.now();
    const data = spamTracker.get(playerName);
    if (!data) {
        spamTracker.set(playerName, { count: 1, resetTime: now });
        return false;
    }
    if (now - data.resetTime > SPAM_WINDOW_MS) {
        spamTracker.set(playerName, { count: 1, resetTime: now });
        return false;
    }
    data.count++;
    spamTracker.set(playerName, data);
    return data.count > SPAM_LIMIT;
}

// WebSocket: استقبال الرسائل من العملاء وإعادة بثها للجميع
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`Client connected (${clients.size} total)`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { playerName, msg, timestamp } = data;
            
            if (!playerName || !msg) return;

            // منع السبام
            if (isSpamming(playerName)) {
                ws.send(JSON.stringify({ error: 'Spam detected' }));
                return;
            }

            console.log(`[${new Date().toISOString()}] ${playerName}: ${msg}`);

            // بث الرسالة لجميع العملاء المتصلين (بما فيهم المرسل)
            const broadcastMsg = JSON.stringify({
                playerName,
                message: msg,
                timestamp: timestamp || Date.now()
            });
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastMsg);
                }
            });
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Client disconnected (${clients.size} remaining)`);
    });
});

// نقطة HTTP للتحقق من صحة الخادم (اختياري)
app.get('/status', (req, res) => {
    res.json({ status: 'ok', clients: clients.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT} (WebSocket ready)`);
});
