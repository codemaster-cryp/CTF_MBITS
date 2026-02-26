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
const OVERWATCH_FILE = path.join(__dirname, 'overwatch.json');
const DO_NOTHING_TEMPLATE = path.join(__dirname, 'do_nothing_ctf', 'templates', 'index.html');
const SUDOKU_TEMPLATE = path.join(__dirname, 'sudoku-ctf', 'challenge', 'templates', 'index.html');
const EMOJI_CTF_FILE = path.join(__dirname, 'emoji_ctf', 'emoji test');
const MBITS_IMAGE_FILE = path.join(__dirname, 'mbits.png');
const SIMPLE_IMAGE_FILE = path.join(__dirname, 'simple.png');
const MIRROR_TEMPLATES = path.join(__dirname, 'mirror-of-erised-ctf', 'templates');
const mirrorLeaks = [];
const EVILCORP_DIR = path.join(__dirname, 'sql evilcorp_ctf');
const EVILCORP_DB = path.join(EVILCORP_DIR, 'database.db');
const EVILCORP_TEMPLATE = path.join(EVILCORP_DIR, 'templates', 'login.html');
let evilcorpDbPromise;
const SCORE_WEIGHTS = { easy: 10, medium: 30, hard: 100 };
const OVERWATCH_ADMIN_RESET_CODE = process.env.OVERWATCH_ADMIN_RESET_CODE || 'RESETX104';
const DO_NOTHING_FLAG = 'Mbits{leader_of_the_dark_army}';
const doNothingSessions = {};
const SUDOKU_FLAG = 'MBITS{hello friend}';
const sudokuSessions = {};

const sudokuBaseBoard = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

const sudokuMask = [
    [1, 1, 0, 0, 1, 0, 0, 1, 1],
    [1, 0, 0, 1, 1, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 1, 0, 1, 1],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 1, 1, 0],
    [1, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 1, 0, 0, 1, 0, 0, 1, 1]
];

function normalizePlayerName(name) {
    const trimmed = String(name || '').trim();
    return trimmed || 'Unknown Hacker';
}

function createDefaultOverwatchState() {
    return { players: {}, activity: [] };
}

function loadOverwatchState() {
    try {
        const parsed = JSON.parse(fs.readFileSync(OVERWATCH_FILE, 'utf8'));
        if (!parsed || typeof parsed !== 'object') return createDefaultOverwatchState();
        return {
            players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
            activity: Array.isArray(parsed.activity) ? parsed.activity : []
        };
    } catch (e) {
        return createDefaultOverwatchState();
    }
}

function saveOverwatchState() {
    fs.writeFileSync(OVERWATCH_FILE, JSON.stringify(overwatchState, null, 2), 'utf8');
}

function getMaxScore() {
    const flags = loadFlags();
    const easyCount = Array.isArray(flags.easy) ? flags.easy.length : 0;
    const mediumCount = Array.isArray(flags.medium) ? flags.medium.length : 0;
    const hardCount = Array.isArray(flags.hard) ? flags.hard.length : 0;
    return (easyCount * SCORE_WEIGHTS.easy) + (mediumCount * SCORE_WEIGHTS.medium) + (hardCount * SCORE_WEIGHTS.hard);
}

let overwatchState = loadOverwatchState();

function ensurePlayer(playerName) {
    const name = normalizePlayerName(playerName);
    if (!overwatchState.players[name]) {
        const now = new Date().toISOString();
        overwatchState.players[name] = {
            name,
            score: 0,
            counts: { easy: 0, medium: 0, hard: 0 },
            flags: [],
            joinedAt: now,
            lastUpdate: now,
            completedAt: null
        };
    }
    return overwatchState.players[name];
}

function registerPlayer(playerName) {
    const player = ensurePlayer(playerName);
    saveOverwatchState();
    return player;
}

function recordFlagForPlayer(playerName, flag, difficulty) {
    const player = ensurePlayer(playerName);
    const normalizedFlag = String(flag || '').trim();
    const alreadySubmitted = player.flags.some((entry) => entry.flag === normalizedFlag);
    if (alreadySubmitted) {
        return { player, added: false, pointsAwarded: 0 };
    }

    const points = SCORE_WEIGHTS[difficulty] || 0;
    const now = new Date().toISOString();
    player.flags.push({ flag: normalizedFlag, difficulty, points, timestamp: now });
    player.counts[difficulty] = (player.counts[difficulty] || 0) + 1;
    player.score += points;
    player.lastUpdate = now;

    const maxScore = getMaxScore();
    if (!player.completedAt && maxScore > 0 && player.score >= maxScore) {
        player.completedAt = now;
    }

    overwatchState.activity.unshift({
        playerName: player.name,
        flag: normalizedFlag,
        difficulty,
        points,
        timestamp: now
    });
    overwatchState.activity = overwatchState.activity.slice(0, 250);
    saveOverwatchState();
    return { player, added: true, pointsAwarded: points };
}

function getOverwatchPayload() {
    const maxScore = getMaxScore();
    const leaderboard = Object.values(overwatchState.players)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
        })
        .map((player, index) => ({
            rank: index + 1,
            name: player.name,
            score: player.score,
            maxScore,
            easy: player.counts.easy || 0,
            medium: player.counts.medium || 0,
            hard: player.counts.hard || 0,
            totalFlags: Array.isArray(player.flags) ? player.flags.length : 0,
            completedAt: player.completedAt,
            joinedAt: player.joinedAt,
            lastUpdate: player.lastUpdate
        }));

    return {
        title: 'Overwatch',
        maxScore,
        updatedAt: new Date().toISOString(),
        leaderboard,
        activity: overwatchState.activity.slice(0, 40)
    };
}

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

function getClientId(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function renderDoNothing() {
    const html = fs.readFileSync(DO_NOTHING_TEMPLATE, 'utf8');
    return html
        .replace(/fetch\("\/start"/g, 'fetch("/do-nothing/start"')
        .replace(/fetch\("\/flag"/g, 'fetch("/do-nothing/flag"');
}

function shuffleArray(values) {
    const items = [...values];
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function generateSudokuBoard() {
    const digits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const solved = sudokuBaseBoard.map((row) =>
        row.map((value) => digits[value - 1])
    );

    const puzzle = sudokuMask.map((maskRow, rowIndex) =>
        maskRow.map((maskValue, colIndex) =>
            maskValue === 1 ? solved[rowIndex][colIndex] : 0
        )
    );

    return { solved, puzzle };
}

function renderSudokuChallenge(puzzle) {
    const html = fs.readFileSync(SUDOKU_TEMPLATE, 'utf8');
    return html
        .replace('const puzzle = {{ puzzle | tojson }};', `const puzzle = ${JSON.stringify(puzzle)};`)
        .replace(/fetch\("\/submit"/g, 'fetch("/sudoku/submit"');
}

function renderEmojiChallenge() {
    return fs.readFileSync(EMOJI_CTF_FILE, 'utf8');
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

app.get('/overwatch', (req, res) => {
    res.json(getOverwatchPayload());
});

app.post('/overwatch/register', (req, res) => {
    const name = normalizePlayerName(req.body && req.body.name);
    const player = registerPlayer(name);
    const payload = getOverwatchPayload();
    const rank = payload.leaderboard.findIndex((entry) => entry.name === player.name) + 1;
    res.json({ ok: true, player: player.name, rank });
});

app.post('/overwatch/reset', (req, res) => {
    const adminCode = String(req.body && req.body.adminCode || '').trim();
    if (!adminCode) {
        return res.status(400).json({ ok: false, message: 'adminCode required' });
    }
    if (adminCode !== OVERWATCH_ADMIN_RESET_CODE) {
        return res.status(403).json({ ok: false, message: 'Invalid admin code' });
    }

    overwatchState = createDefaultOverwatchState();
    saveOverwatchState();
    return res.json({ ok: true, message: 'Overwatch logs reset' });
});

// Do Nothing challenge (ported from do_nothing_ctf/app.py)
app.get('/do-nothing', (req, res) => {
    res.type('html').send(renderDoNothing());
});

app.post('/do-nothing/start', (req, res) => {
    const sessionId = getClientId(req);
    doNothingSessions[sessionId] = Date.now();
    res.json({ status: 'started' });
});

app.post('/do-nothing/flag', (req, res) => {
    const sessionId = getClientId(req);
    const startedAt = doNothingSessions[sessionId];
    if (!startedAt) {
        return res.status(403).json({ error: 'Session not started' });
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= 30000) {
        return res.json({ flag: DO_NOTHING_FLAG });
    }

    doNothingSessions[sessionId] = Date.now();
    return res.status(403).json({ error: 'You moved. Timer reset.' });
});

// Sudoku challenge (ported from sudoku-ctf/challenge/app.py)
app.get('/sudoku', (req, res) => {
    const { solved, puzzle } = generateSudokuBoard();
    const sessionId = getClientId(req);
    sudokuSessions[sessionId] = solved;
    res.type('html').send(renderSudokuChallenge(puzzle));
});

app.post('/sudoku/submit', (req, res) => {
    const sessionId = getClientId(req);
    const solution = sudokuSessions[sessionId];
    const userGrid = req.body && req.body.grid;

    if (!solution) {
        return res.json({ result: 'Session expired' });
    }

    if (!Array.isArray(userGrid) || userGrid.length !== 9) {
        return res.json({ result: 'Wrong!' });
    }

    for (let row = 0; row < 9; row++) {
        if (!Array.isArray(userGrid[row]) || userGrid[row].length !== 9) {
            return res.json({ result: 'Wrong!' });
        }
        for (let col = 0; col < 9; col++) {
            if (Number(userGrid[row][col]) !== solution[row][col]) {
                return res.json({ result: 'Wrong!' });
            }
        }
    }

    return res.json({ flag: SUDOKU_FLAG });
});

app.get('/emoji-ctf', (req, res) => {
    try {
        res.type('html').send(renderEmojiChallenge());
    } catch (err) {
        res.status(500).json({ error: 'emoji ctf not available' });
    }
});

app.get('/download/mbits', (req, res) => {
    if (!fs.existsSync(MBITS_IMAGE_FILE)) {
        return res.status(404).json({ error: 'mbits.png not found' });
    }
    return res.download(MBITS_IMAGE_FILE, 'mbits.png');
});

app.get('/download/simple', (req, res) => {
    if (!fs.existsSync(SIMPLE_IMAGE_FILE)) {
        return res.status(404).json({ error: 'simple.png not found' });
    }
    return res.download(SIMPLE_IMAGE_FILE, 'simple.png');
});

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
    if (found) {
        registerPlayer(name);
        return res.json({ valid: true });
    }
    return res.json({ valid: false, message: 'pseudocode not found' });
});

// POST /verify-flag { flag }
app.post('/verify-flag', (req, res) => {
    try {
        const { flag, playerName } = req.body || {};
        if (!flag) {
            console.log('[CTF-verify-flag] Missing flag');
            return res.status(400).json({ valid: false, message: 'flag required' });
        }
        const cleanedFlag = String(flag).trim();
        const cleanedPlayer = normalizePlayerName(playerName);
        const difficulty = findFlagDifficulty(flag);
        console.log('[CTF-verify-flag] Player:', cleanedPlayer, 'Flag:', cleanedFlag, '-> Difficulty:', difficulty);
        if (difficulty) {
            const result = recordFlagForPlayer(cleanedPlayer, cleanedFlag, difficulty);
            return res.json({
                valid: true,
                difficulty,
                player: cleanedPlayer,
                pointsAwarded: result.pointsAwarded,
                duplicate: !result.added,
                score: result.player.score,
                maxScore: getMaxScore()
            });
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
    console.log(`Endpoints: /verify, /verify-flag, /overwatch, /overwatch/register, /overwatch/reset, /do-nothing/*, /sudoku/*, /emoji-ctf, /download/mbits, /download/simple, /hogwarts/*, /evilcorp`);
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
