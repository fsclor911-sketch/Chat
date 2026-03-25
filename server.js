const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

// تخزين قائمة انتظار الرسائل لكل عميل (لمحاكاة الإرسال الفوري)
// سنستخدم Map حيث المفتاح هو معرف العميل (مؤقت)، ولكن بما أن HTTP عديم الحالة،
// سنستخدم آلية بسيطة: عندما يرسل لاعب رسالة، نخزنها في مصفوفة مؤقتة لجميع العملاء الذين يطلبونها خلال ثانيتين.
// هذه مصفوفة "لحظية" تُفرغ بعد ثانيتين.
let recentMessages = [];
let lastClear = Date.now();

// مسح الرسائل القديمة كل ثانيتين
setInterval(() => {
    recentMessages = [];
    lastClear = Date.now();
}, 2000);

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
    // إضافة الرسالة إلى المصفوفة المؤقتة
    recentMessages.push(newMsg);

    console.log(`[${new Date().toISOString()}] ${playerName}: ${message}`);
    res.json({ success: true });
});

app.get('/messages', (req, res) => {
    // إرجاع الرسائل التي حدثت خلال آخر ثانيتين فقط
    // (يعني اللاعبون المتصلون الآن سيرون الرسائل التي أرسلت أثناء تواجدهم)
    res.json(recentMessages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT} (no message history)`);
});
