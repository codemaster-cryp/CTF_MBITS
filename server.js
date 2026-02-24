// Minimal verification server for CTF pseudocodes
// Run: npm install && node server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

let initSqlJs;
try {
    initSqlJs = require('sql.js');
} catch (err) {
    console.warn('[CTF] sql.js not installed. /evilcorp route will not work.');
    console.warn('[CTF] Run: npm install sql.js');
    initSqlJs = null;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// serve static HTML/CSS/JS from project root
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'pseudocodes.json');
const FLAGS_FILE = path.join(__dirname, 'flags.json');
const MIRROR_TEMPLATES = path.join(__dirname, 'mirror-of-erised-ctf', 'templates');
const mirrorLeaks = [];
const EVILCORP_DIR = path.join(__dirname, 'sql evilcorp_ctf');
const EVILCORP_DB = path.join(EVILCORP_DIR, 'database.db');
const EVILCORP_TEMPLATE = path.join(EVILCORP_DIR, 'templates', 'login.html');
let evilcorpDbPromise;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function loadTemplate(name) {
    return fs.readFileSync(path.join(MIRROR_TEMPLATES, name), 'utf8');
}

function renderMirror(token) {
    const html = loadTemplate('mirror.html');
    return html.replace(/\{\{\s*token\s*\}\}/g, token);
}

function renderAttacker() {
    return loadTemplate('attacker.html');
}

function renderLeaks(leaks) {
    const html = loadTemplate('leaks.html');
    const listItems = leaks.map((leak) => `<li>${escapeHtml(leak)}</li>`).join('');
    return html.replace(/\{\%\s*for\s+leak\s+in\s+leaks\s*\%\}[\s\S]*?\{\%\s*endfor\s*\%\}/g, listItems);
}

function renderEvilcorp(message) {
    const html = fs.readFileSync(EVILCORP_TEMPLATE, 'utf8');
    return html.replace(/\{\{\s*message\s*\}\}/g, escapeHtml(message || ''));
}

async function getEvilcorpDb() {
    if (!initSqlJs) {
        throw new Error('sql.js not installed. Run: npm install sql.js');
    }
    if (!evilcorpDbPromise) {
        evilcorpDbPromise = (async () => {
            const SQL = await initSqlJs();
            const dbBuffer = fs.readFileSync(EVILCORP_DB);
            return new SQL.Database(dbBuffer);
        })();
    }
    return evilcorpDbPromise;
}

function loadCodes() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
    } catch (e) {
        return [];
    }
}

function loadFlags() {
    try {
        return JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf8')) || { easy: [], medium: [], hard: [] };
    } catch (e) {
        return { easy: [], medium: [], hard: [] };
    }
}

function findFlagDifficulty(flagStr) {
    const flags = loadFlags();
    const trimmed = String(flagStr).trim();
    for (const [difficulty, list] of Object.entries(flags)) {
        if (Array.isArray(list) && list.includes(trimmed)) {
            return difficulty;
        }
    }
    return null;
}

app.get('/health', (req, res) => res.json({ ok: true }));

// Mirror of Erised routes (ported from mirror-of-erised-ctf/app.py)
app.get('/mirror-of-erised', (req, res) => {
    res.type('html').send(
        '<h2>Welcome to The Mirror of Erised CTF</h2>' +
        '<p><a href="/hogwarts/mirror?stone=1broom2wand3key">Visit Hogwarts Archive</a></p>' +
        '<p><a href="/attacker">Launch the Attacker Page</a></p>' +
        '<p><a href="/attacker/leaks">View Leaked Referrers</a></p>'
    );
});

app.get('/hogwarts/mirror', (req, res) => {
    const token = '1broom2wand3key';
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.set('Link', `<${baseUrl}/attacker/collect>; rel=preload; as=image; referrer-policy=unsafe-url`);
    res.type('html').send(renderMirror(token));
});

app.get('/attacker', (req, res) => {
    res.type('html').send(renderAttacker());
});

app.get('/attacker/collect', (req, res) => {
    const ref = req.get('Referer') || 'No Referer Sent';
    mirrorLeaks.push(ref);
    res.type('text').send('Referrer collected');
});

app.get('/attacker/leaks', (req, res) => {
    res.type('html').send(renderLeaks(mirrorLeaks));
});

// Evilcorp SQL challenge routes (ported from sql evilcorp_ctf/app.py)
app.get('/evilcorp', (req, res) => {
    res.type('html').send(renderEvilcorp(''));
});

app.post('/evilcorp', async (req, res) => {
    const username = req.body.username || '';
    const password = req.body.password || '';
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    let message = 'Invalid credentials.';

    try {
        const db = await getEvilcorpDb();
        const result = db.exec(query);
        if (result.length && result[0].values.length) {
            const columns = result[0].columns || [];
            const row = result[0].values[0];
            const userIndex = columns.indexOf('username');
            const passIndex = columns.indexOf('password');
            const user = userIndex >= 0 ? row[userIndex] : row[1] || 'user';
            const pass = passIndex >= 0 ? row[passIndex] : row[2] || 'unknown';
            message = `Welcome ${user}! Your password is: ${pass}`;
        }
    } catch (err) {
        message = 'Database error.';
    }

    res.type('html').send(renderEvilcorp(message));
});

// POST /verify { name, pseudocode }
app.post('/verify', (req, res) => {
    const { name, pseudocode } = req.body || {};
    if (!name || !pseudocode) return res.status(400).json({ valid: false, message: 'name and pseudocode required' });
    const codes = loadCodes();
    const found = codes.includes(String(pseudocode).trim());
    if (found) return res.json({ valid: true });
    return res.json({ valid: false, message: 'pseudocode not found' });
});

// POST /verify-flag { flag }
app.post('/verify-flag', (req, res) => {
    try {
        const { flag } = req.body || {};
        if (!flag) {
            console.log('[CTF-verify-flag] Missing flag');
            return res.status(400).json({ valid: false, message: 'flag required' });
        }
        const difficulty = findFlagDifficulty(flag);
        console.log('[CTF-verify-flag] Flag:', flag, '-> Difficulty:', difficulty);
        if (difficulty) {
            return res.json({ valid: true, difficulty });
        }
        return res.json({ valid: false, message: 'flag not found' });
    } catch (err) {
        console.error('[CTF-verify-flag] Error:', err);
        res.status(500).json({ valid: false, message: 'Server error' });
    }
});

// 404 handler
app.use((req, res) => {
    console.warn(`[CTF] 404: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[CTF] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('🔐 CTF Verification Server Started');
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Endpoints: /verify, /verify-flag, /hogwarts/*, /evilcorp`);
    console.log(`${'='.repeat(50)}\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error('Kill existing process or use different port: export PORT=5000 && npm run start');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
