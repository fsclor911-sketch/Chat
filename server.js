const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// منع السبام: 3 رسائل لكل 5 ثوانٍ لكل لاعب
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

// تخزين الرسائل المؤقتة (آخر 5 ثوانٍ فقط)
let recentMessages = [];
let lastClear = Date.now();

setInterval(() => {
    recentMessages = [];
    lastClear = Date.now();
}, 5000); // مسح كل 5 ثوانٍ

app.post('/send', (req, res) => {
    const { playerName, message, timestamp } = req.body;
    if (!playerName || !message) {
        return res.status(400).json({ error: 'Missing data' });
    }

    if (isSpamming(playerName)) {
        return res.status(429).json({ error: 'Spam detected' });
    }

    const newMsg = {
        playerName,
        message,
        timestamp: timestamp || Date.now()
    };
    recentMessages.push(newMsg);
    console.log(`[${new Date().toISOString()}] ${playerName}: ${message}`);
    res.json({ success: true });
});

app.get('/messages', (req, res) => {
    // إرجاع الرسائل خلال آخر 5 ثوانٍ فقط
    res.json(recentMessages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});
