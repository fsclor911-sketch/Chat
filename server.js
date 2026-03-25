const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// تخزين آخر 50 رسالة
let messages = [];
const MAX_MESSAGES = 50;

// منع السبام (3 رسائل كل 5 ثوانٍ)
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
    messages.push(newMsg);
    if (messages.length > MAX_MESSAGES) messages.shift();

    console.log(`[${new Date().toISOString()}] ${playerName}: ${message}`);
    res.json({ success: true });
});

app.get('/messages', (req, res) => {
    res.json(messages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});
