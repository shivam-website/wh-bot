const express = require('express');
const session = require('express-session');
const venom = require('venom-bot');
const { start } = require('./bot'); // You must define this in bot.js

const app = express();
const PORT = 3000;

let botClient = null;
let isBotRunning = false;
let latestQR = null;

const VALID_CREDENTIALS = {
  id: 'admin',
  password: 'pass123' // Change this before production
};

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'diamondsecret',
  resave: false,
  saveUninitialized: true
}));

// Middleware to protect private routes
function authMiddleware(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/');
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req, res) => {
  const { id, password } = req.body;
  if (id === VALID_CREDENTIALS.id && password === VALID_CREDENTIALS.password) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.send('❌ Invalid ID or password');
  }
});

app.get('/dashboard', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// ✅ Status route
app.get('/status', authMiddleware, (req, res) => {
  res.send(isBotRunning ? '🟢 Bot is running' : '🔴 Bot is stopped');
});

// ✅ QR endpoint
app.get('/qr', authMiddleware, (req, res) => {
  if (latestQR) {
    res.send(`
      <h2>📱 Scan QR Code to Connect WhatsApp</h2>
      <img src="${latestQR}" style="width:300px;height:300px;" />
      <p>Open WhatsApp → Linked Devices → Scan QR Code</p>
    `);
  } else {
    res.send('✅ Bot already connected or QR not available.');
  }
});

// ✅ Start bot
app.get('/start-bot', authMiddleware, (req, res) => {
  if (isBotRunning) return res.send('✅ Bot is already running.');

  venom.create(
    'whatsapp-session',
    (base64Qr, asciiQR, attempts, urlCode) => {
      console.log('📱 QR Code URL:', urlCode);
      latestQR = base64Qr;
    },
    (statusSession, session) => {
      console.log('🔁 Session Status:', statusSession);
    },
    {
      multidevice: true,
      headless: true
    }
  ).then(client => {
    botClient = client;
    start(client); // call your actual bot logic
    isBotRunning = true;
    latestQR = null;
    console.log('✅ Bot connected.');
  }).catch(err => {
    console.log('❌ Bot failed to start:', err);
  });

  res.send('🔄 Bot starting... Visit /qr to scan QR code.');
});

// ✅ Stop bot
app.get('/stop-bot', authMiddleware, async (req, res) => {
  if (!isBotRunning || !botClient) return res.send('🔴 Bot is not running.');
  await botClient.close();
  botClient = null;
  isBotRunning = false;
  res.send('🛑 Bot stopped successfully.');
});

app.listen(PORT, () => {
  console.log(`🚀 Panel running at: http://localhost:${PORT}`);
});
