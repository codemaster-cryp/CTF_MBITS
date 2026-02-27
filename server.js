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
const CEASER_CIPHER_HTML = path.join(__dirname, 'CEASER CIPHER', 'easy-caesar-ctf', 'challenge', 'index.html');
const CEASER_CIPHER_CSS = path.join(__dirname, 'CEASER CIPHER', 'easy-caesar-ctf', 'challenge', 'style.css');
const MORSE_AUDIO_FILE = path.join(__dirname, 'morse', 'morse.mp3');
const FIND_LOCATION_PROMPT = path.join(__dirname, 'find location', 'challenge');
const FIND_LOCATION_IMAGE = path.join(__dirname, 'find location', 'location.jpg');
const MBITS_IMAGE_FILE = path.join(__dirname, 'mbits.png');
const FINAL_IMAGE_FILE = path.join(__dirname, 'final.png');
const SIMPLE_IMAGE_FILE = path.join(__dirname, 'simple.png');
const SIMPLE_ZIP_FILE = path.join(__dirname, 'simple.zip');
const MBITS_ROBOTS_DIR = path.join(__dirname, 'mbits_robots_ctf');
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
const BINHEXA_FLAG = 'mbits{elliots_mind_is_root}';
const binhexaSessions = {};
const HASHCRACK_FLAG = 'mbits{Darlene @lderson}';
const hashcrackSessions = {};
const MINDREADER_FLAG = 'mbits{this_flag_is_elliot}';
const mindreaderSessions = {};
const hashcrackPasswords = ['laptop', 'mbits111', 'qwerty123'];
const hashcrackHashes = [
    '312f91285e048e09bb4aefef23627994',
    '45223b15f0bbd03ea1bb7646d05568bced01a1be',
    'daaad6e5604e8e17bd9f108d91e26afe6281dac8fda0091040a7a6d7bd9b43b5'
];

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

function renderCeaserCipherChallenge() {
    const html = fs.readFileSync(CEASER_CIPHER_HTML, 'utf8');
    return html.replace('href="style.css"', 'href="/caesar-ctf/style.css"');
}

function renderFindLocationChallenge() {
        const prompt = fs.existsSync(FIND_LOCATION_PROMPT)
                ? fs.readFileSync(FIND_LOCATION_PROMPT, 'utf8').trim()
                : 'Find the target location from the image metadata.';

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Find Location</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0d14; color:#d8f5ff; font-family:'Courier New', monospace; }
        .panel { width:min(920px, 94vw); background:rgba(8,16,24,.92); border:1px solid rgba(121,201,255,.4); border-radius:14px; padding:22px; box-shadow:0 12px 34px rgba(0,0,0,.45); }
        h1 { margin:0 0 10px; color:#8be6ff; }
        .prompt { color:#c8e3ea; margin-bottom:14px; white-space:pre-wrap; }
        .img-wrap { background:#050b10; border:1px dashed rgba(121,201,255,.35); border-radius:10px; padding:12px; text-align:center; }
        img { max-width:100%; border-radius:8px; }
        .actions { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
        a, button { text-decoration:none; border:1px solid rgba(121,201,255,.5); color:#bdf0ff; background:#0a1a28; border-radius:10px; padding:9px 14px; font-weight:700; cursor:pointer; }
        a:hover, button:hover { background:#133149; }
    </style>
</head>
<body>
    <div class="panel">
        <h1>Find Location</h1>
        <div class="prompt">${escapeHtml(prompt)}</div>
        <div class="img-wrap">
            <img src="/find-location/image" alt="location challenge image" />
        </div>
        <div class="actions">
            <a href="/find-location/image" download="location.jpg">Download image</a>
            <button onclick="window.location='medium.html'">Back to Medium</button>
        </div>
    </div>
</body>
</html>`;
}

function renderMorseChallenge() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Morse Signal</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#080b12; color:#d8f4ff; font-family:'Courier New', monospace; }
        .panel { width:min(860px, 94vw); background:rgba(8,16,26,.94); border:1px solid rgba(122,208,255,.35); border-radius:14px; padding:24px; box-shadow:0 12px 34px rgba(0,0,0,.45); }
        h1 { margin:0 0 8px; color:#8ce8ff; }
        .sub { color:#bfdbe6; margin-bottom:14px; }
        .note { color:#9dc3d2; margin-top:14px; }
        audio { width:100%; margin:12px 0; }
        .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
        a, button { text-decoration:none; border:1px solid rgba(122,208,255,.45); color:#c8f5ff; background:#0b1d30; border-radius:10px; padding:9px 14px; font-weight:700; cursor:pointer; }
        a:hover, button:hover { background:#153555; }
    </style>
</head>
<body>
    <div class="panel">
        <h1>Morse Intercept</h1>
        <div class="sub">Decode the intercepted transmission and recover the flag.</div>
        <audio controls preload="metadata" src="/morse-ctf/audio"></audio>
        <div class="actions">
            <a href="/morse-ctf/audio" download="morse.mp3">Download morse.mp3</a>
            <a href="https://morsecode.world/international/decoder/audio-decoder-expert.html" target="_blank" rel="noopener noreferrer">Open Morse Decoder</a>
            <button onclick="window.location='medium.html'">Back to Medium</button>
        </div>
        <div class="note">Tip: Upload the audio into a Morse decoder and read the output carefully.</div>
    </div>
</body>
</html>`;
}

function renderHashcrackChallenge() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HashCrack Challenge</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0d12; color:#d9eaff; font-family:'Courier New', monospace; }
        .panel { width:min(860px,94vw); background:rgba(10,16,24,.94); border:1px solid rgba(123,163,255,.35); border-radius:14px; padding:24px; box-shadow:0 12px 36px rgba(0,0,0,.48); }
        h1 { margin:0 0 8px; color:#93b5ff; }
        .sub { color:#b7c8eb; margin-bottom:14px; }
        .hashbox { background:#060b12; border:1px dashed rgba(123,163,255,.4); border-radius:10px; padding:12px; word-break:break-all; color:#dbe6ff; margin-bottom:10px; }
        input { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:10px; border:1px solid rgba(123,163,255,.5); background:#0d1624; color:#e5eeff; font-family:inherit; }
        .actions { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
        button { border:1px solid rgba(123,163,255,.5); color:#cfe2ff; background:#13223a; border-radius:10px; padding:9px 14px; font-weight:700; cursor:pointer; }
        button:hover { background:#1c3560; }
        #msg { margin-top:12px; min-height:22px; color:#a9ffd1; }
        .bad { color:#ff9cab !important; }
    </style>
</head>
<body>
    <div class="panel">
        <h1>HashCrack Challenge</h1>
        <div class="sub">Crack all 3 hashes in order and submit plaintext for each.</div>
        <div class="hashbox" id="hashbox">Loading hash...</div>
        <input id="answer" placeholder="Enter plaintext" autocomplete="off" />
        <div class="actions">
            <button id="submit">Submit</button>
            <button id="restart">Restart</button>
            <button onclick="window.location='medium.html'">Back</button>
        </div>
        <div id="msg"></div>
    </div>
<script>
    const hashbox = document.getElementById('hashbox');
    const answer = document.getElementById('answer');
    const msg = document.getElementById('msg');
    const submitBtn = document.getElementById('submit');
    const restartBtn = document.getElementById('restart');

    async function start() {
        const res = await fetch('/hashcrack/start', { method: 'POST' });
        const data = await res.json();
        hashbox.textContent = 'Hash ' + data.index + '/3: ' + data.hash;
        answer.value = '';
        msg.textContent = '';
        msg.classList.remove('bad');
        answer.focus();
    }

    async function submit() {
        const res = await fetch('/hashcrack/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: answer.value.trim() })
        });
        const data = await res.json();

        if (!res.ok || data.ok === false) {
            msg.textContent = data.message || 'Wrong answer.';
            msg.classList.add('bad');
            return;
        }

        msg.classList.remove('bad');
        if (data.flag) {
            msg.textContent = 'FLAG: ' + data.flag;
            hashbox.textContent = 'Challenge completed.';
            answer.value = '';
            return;
        }

        msg.textContent = data.message || 'Correct!';
        hashbox.textContent = 'Hash ' + data.index + '/3: ' + data.hash;
        answer.value = '';
        answer.focus();
    }

    submitBtn.addEventListener('click', submit);
    restartBtn.addEventListener('click', start);
    answer.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    start();
</script>
</body>
</html>`;
}

function renderMindreaderChallenge() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MindReader</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0f14; color:#d9ecff; font-family:'Courier New', monospace; }
        .panel { width:min(860px,94vw); background:rgba(10,16,26,.94); border:1px solid rgba(135,168,255,.35); border-radius:14px; padding:24px; box-shadow:0 12px 36px rgba(0,0,0,.48); }
        h1 { margin:0 0 8px; color:#a5bfff; }
        .sub { color:#bccbec; margin-bottom:14px; }
        .line { margin:8px 0; color:#d8e5ff; }
        input { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:10px; border:1px solid rgba(135,168,255,.5); background:#10192a; color:#e8f0ff; font-family:inherit; }
        .actions { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
        button { border:1px solid rgba(135,168,255,.5); color:#d8e6ff; background:#182a47; border-radius:10px; padding:9px 14px; font-weight:700; cursor:pointer; }
        button:hover { background:#24416f; }
        #msg { margin-top:12px; min-height:22px; color:#a8ffd0; }
        .bad { color:#ff9cab !important; }
    </style>
</head>
<body>
    <div class="panel">
        <h1>MindReader</h1>
        <div class="sub">Guess the secret number between 1 and 1000 in 10 attempts.</div>
        <div class="line" id="attempts">Attempts left: --</div>
        <input id="guess" placeholder="Enter your guess" autocomplete="off" />
        <div class="actions">
            <button id="submit">Submit Guess</button>
            <button id="restart">Restart</button>
            <button onclick="window.location='medium.html'">Back</button>
        </div>
        <div id="msg"></div>
    </div>

<script>
    const attemptsEl = document.getElementById('attempts');
    const guessEl = document.getElementById('guess');
    const msgEl = document.getElementById('msg');
    const submitBtn = document.getElementById('submit');
    const restartBtn = document.getElementById('restart');

    async function start() {
        const res = await fetch('/mindreader/start', { method: 'POST' });
        const data = await res.json();
        attemptsEl.textContent = 'Attempts left: ' + data.attempts;
        msgEl.textContent = '';
        msgEl.classList.remove('bad');
        guessEl.value = '';
        guessEl.focus();
    }

    async function submitGuess() {
        const guess = guessEl.value.trim();
        const res = await fetch('/mindreader/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess })
        });
        const data = await res.json();

        if (!res.ok || data.ok === false) {
            msgEl.textContent = data.message || 'Invalid guess.';
            msgEl.classList.add('bad');
            return;
        }

        msgEl.classList.remove('bad');
        attemptsEl.textContent = 'Attempts left: ' + data.attempts;

        if (data.flag) {
            msgEl.textContent = 'FLAG: ' + data.flag;
            return;
        }

        if (data.status === 'high') {
            msgEl.textContent = 'Too High';
        } else if (data.status === 'low') {
            msgEl.textContent = 'Too Low';
        } else if (data.status === 'lost') {
            msgEl.textContent = data.message || 'Out of attempts. Better luck next time.';
            msgEl.classList.add('bad');
        } else {
            msgEl.textContent = data.message || 'Try again';
        }
        guessEl.value = '';
        guessEl.focus();
    }

    submitBtn.addEventListener('click', submitGuess);
    restartBtn.addEventListener('click', start);
    guessEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitGuess(); });
    start();
</script>
</body>
</html>`;
}

function bin8(value) {
        return Number(value).toString(2).padStart(8, '0');
}

function createBinhexaSession(clientId) {
        const num1 = Math.floor(Math.random() * 256);
        const num2 = Math.floor(Math.random() * 256);
        const operations = [
        { op: '<<', rule: 'Apply on num1: num1 << 1 (8-bit wrap)', expected: bin8((num1 << 1) & 0xff) },
        { op: '|', rule: 'Apply on num1 and num2: num1 | num2', expected: bin8(num1 | num2) },
        { op: '+', rule: 'Add both numbers: num1 + num2', expected: (num1 + num2).toString(2) },
        { op: '*', rule: 'Multiply both numbers: num1 * num2', expected: (num1 * num2).toString(2) },
        { op: '>>', rule: 'Apply on num2: num2 >> 1', expected: bin8(num2 >> 1) },
        { op: '&', rule: 'Apply on num1 and num2: num1 & num2', expected: bin8(num1 & num2) }
        ];

        binhexaSessions[clientId] = {
                num1,
                num2,
                operations,
                step: 0,
                solved: false,
                createdAt: Date.now()
        };
        return binhexaSessions[clientId];
}

function renderBinhexaPage() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BinHexa Redux</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#070b13; color:#aef7ff; font-family:'Courier New', monospace; }
        .card { width:min(760px,92vw); background:rgba(8,16,24,0.92); border:1px solid #53e8ff66; border-radius:14px; padding:24px; box-shadow:0 14px 34px rgba(0,0,0,.45), inset 0 0 20px rgba(83,232,255,.12); }
        h1 { margin:0 0 8px; color:#7ef0ff; letter-spacing:.8px; }
        .muted { color:#9bc5cf; margin-bottom:14px; }
        .guide { margin:10px 0 14px; padding:10px 12px; border:1px dashed #4be4ff66; border-radius:10px; background:#08121d; color:#b9dbe2; font-size:13px; line-height:1.5; }
        .line { margin:7px 0; }
        .q { margin-top:12px; font-size:18px; color:#ffd970; }
        input { width:100%; margin-top:10px; box-sizing:border-box; padding:10px 12px; border-radius:8px; border:1px solid #4be4ff77; background:#081320; color:#d8fbff; font-family:inherit; }
        .row { display:flex; gap:10px; margin-top:12px; }
        button { padding:10px 14px; border-radius:10px; border:1px solid #4be4ff88; background:#0c1d2f; color:#aff9ff; cursor:pointer; font-weight:700; }
        button:hover { background:#11314b; }
        #msg { margin-top:12px; min-height:22px; color:#9cffad; }
        .bad { color:#ff9aa4 !important; }
    </style>
</head>
<body>
    <div class="card">
        <h1>BinHexa Redux</h1>
        <div class="muted">Solve 6 binary operations, then submit final result in hexadecimal.</div>
        <div class="guide">
            <strong>How to solve each step:</strong><br/>
            Use the two shown binary numbers as <code>num1</code> and <code>num2</code>.<br/>
            <code>&lt;&lt;</code> means <code>num1 &lt;&lt; 1</code>, <code>&gt;&gt;</code> means <code>num2 &gt;&gt; 1</code>, and others use both numbers.<br/>
            Example: <code>1010 | 0110 = 1110</code>.<br/>
            Enter answers in binary for Q1-Q6, then enter hexadecimal for the final question.
        </div>
        <div class="line" id="n1">Binary Number 1: --</div>
        <div class="line" id="n2">Binary Number 2: --</div>
        <div class="q" id="question">Loading challenge...</div>
        <input id="answer" placeholder="Enter answer" autocomplete="off" />
        <div class="row">
            <button id="submit">Submit</button>
            <button id="restart">Restart</button>
            <button onclick="window.location='medium.html'">Back</button>
        </div>
        <div id="msg"></div>
    </div>

<script>
    const n1 = document.getElementById('n1');
    const n2 = document.getElementById('n2');
    const question = document.getElementById('question');
    const answer = document.getElementById('answer');
    const msg = document.getElementById('msg');
    const submitBtn = document.getElementById('submit');
    const restartBtn = document.getElementById('restart');

    async function start() {
        const res = await fetch('/binhexa/start', { method: 'POST' });
        const data = await res.json();
        n1.textContent = 'Binary Number 1: ' + data.bin1;
        n2.textContent = 'Binary Number 2: ' + data.bin2;
        question.textContent = data.prompt;
        answer.value = '';
        answer.focus();
        msg.textContent = '';
        msg.classList.remove('bad');
    }

    async function submit() {
        const res = await fetch('/binhexa/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: answer.value.trim() })
        });
        const data = await res.json();

        if (!res.ok || data.ok === false) {
            msg.textContent = data.message || 'Incorrect answer!';
            msg.classList.add('bad');
            return;
        }

        msg.classList.remove('bad');
        if (data.flag) {
            msg.textContent = 'Flag: ' + data.flag;
            question.textContent = 'Challenge completed.';
            answer.value = '';
            return;
        }

        msg.textContent = data.message || 'Correct!';
        question.textContent = data.prompt;
        answer.value = '';
        answer.focus();
    }

    submitBtn.addEventListener('click', submit);
    restartBtn.addEventListener('click', start);
    answer.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    start();
</script>
</body>
</html>`;
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
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
    overwatchState = loadOverwatchState();
    return res.json({ ok: true, message: 'Overwatch logs reset', payload: getOverwatchPayload() });
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

app.get('/caesar-ctf', (req, res) => {
    try {
        res.type('html').send(renderCeaserCipherChallenge());
    } catch (err) {
        res.status(500).json({ error: 'caesar ctf not available' });
    }
});

app.get('/caesar-ctf/style.css', (req, res) => {
    if (!fs.existsSync(CEASER_CIPHER_CSS)) {
        return res.status(404).type('text').send('Not found');
    }
    return res.type('css').send(fs.readFileSync(CEASER_CIPHER_CSS, 'utf8'));
});

app.get('/find-location', (req, res) => {
    try {
        res.type('html').send(renderFindLocationChallenge());
    } catch (err) {
        res.status(500).json({ error: 'find location challenge not available' });
    }
});

app.get('/find-location/image', (req, res) => {
    if (!fs.existsSync(FIND_LOCATION_IMAGE)) {
        return res.status(404).json({ error: 'location image not found' });
    }
    return res.download(FIND_LOCATION_IMAGE, 'location.jpg');
});

app.get('/morse-ctf', (req, res) => {
    res.type('html').send(renderMorseChallenge());
});

app.get('/morse-ctf/audio', (req, res) => {
    if (!fs.existsSync(MORSE_AUDIO_FILE)) {
        return res.status(404).json({ error: 'morse.mp3 not found' });
    }
    return res.download(MORSE_AUDIO_FILE, 'morse.mp3');
});

app.get('/binhexa', (req, res) => {
    res.type('html').send(renderBinhexaPage());
});

app.post('/binhexa/start', (req, res) => {
    const clientId = getClientId(req);
    const session = createBinhexaSession(clientId);
    const first = session.operations[0];
    return res.json({
        ok: true,
        bin1: bin8(session.num1),
        bin2: bin8(session.num2),
        prompt: `Question 1/6 — Operation '${first.op}' • ${first.rule}`
    });
});

app.post('/binhexa/answer', (req, res) => {
    const clientId = getClientId(req);
    const session = binhexaSessions[clientId];
    const answer = String(req.body && req.body.answer || '').trim();

    if (!session) {
        return res.status(400).json({ ok: false, message: 'Session not started. Click Restart.' });
    }
    if (!answer) {
        return res.status(400).json({ ok: false, message: 'Enter an answer first.' });
    }

    if (session.step < 6) {
        const opInfo = session.operations[session.step];
        if (answer !== opInfo.expected) {
            delete binhexaSessions[clientId];
            return res.status(400).json({ ok: false, message: 'Incorrect answer! Session reset. Click Restart.' });
        }

        session.step += 1;
        if (session.step === 6) {
            return res.json({ ok: true, message: 'Correct! Final step: enter the result in hexadecimal.', prompt: 'Final Question — Enter hex for last result' });
        }
        const next = session.operations[session.step];
        return res.json({ ok: true, message: 'Correct!', prompt: `Question ${session.step + 1}/6 — Operation '${next.op}' • ${next.rule}` });
    }

    const expectedHex = parseInt(session.operations[5].expected, 2).toString(16);
    if (answer.toLowerCase() !== expectedHex) {
        delete binhexaSessions[clientId];
        return res.status(400).json({ ok: false, message: 'Incorrect hex answer! Session reset. Click Restart.' });
    }

    delete binhexaSessions[clientId];
    return res.json({ ok: true, flag: BINHEXA_FLAG });
});

app.get('/hashcrack', (req, res) => {
    res.type('html').send(renderHashcrackChallenge());
});

app.post('/hashcrack/start', (req, res) => {
    const clientId = getClientId(req);
    hashcrackSessions[clientId] = { step: 0, createdAt: Date.now() };
    return res.json({ ok: true, index: 1, hash: hashcrackHashes[0] });
});

app.post('/hashcrack/answer', (req, res) => {
    const clientId = getClientId(req);
    const session = hashcrackSessions[clientId];
    const answer = String(req.body && req.body.answer || '').trim();

    if (!session) {
        return res.status(400).json({ ok: false, message: 'Session not started. Click Restart.' });
    }
    if (!answer) {
        return res.status(400).json({ ok: false, message: 'Enter plaintext first.' });
    }

    const expected = hashcrackPasswords[session.step];
    if (answer !== expected) {
        delete hashcrackSessions[clientId];
        return res.status(400).json({ ok: false, message: 'Wrong answer. Session reset.' });
    }

    session.step += 1;
    if (session.step >= hashcrackPasswords.length) {
        delete hashcrackSessions[clientId];
        return res.json({ ok: true, flag: HASHCRACK_FLAG });
    }

    return res.json({
        ok: true,
        message: 'Correct!',
        index: session.step + 1,
        hash: hashcrackHashes[session.step]
    });
});

app.get('/mindreader', (req, res) => {
    res.type('html').send(renderMindreaderChallenge());
});

app.post('/mindreader/start', (req, res) => {
    const clientId = getClientId(req);
    mindreaderSessions[clientId] = {
        secret: Math.floor(Math.random() * 1000) + 1,
        attempts: 10,
        createdAt: Date.now()
    };
    return res.json({ ok: true, attempts: 10 });
});

app.post('/mindreader/guess', (req, res) => {
    const clientId = getClientId(req);
    const session = mindreaderSessions[clientId];
    const guess = Number(String(req.body && req.body.guess || '').trim());

    if (!session) {
        return res.status(400).json({ ok: false, message: 'Session not started. Click Restart.' });
    }
    if (!Number.isInteger(guess) || guess < 1 || guess > 1000) {
        return res.status(400).json({ ok: false, message: 'Enter a valid integer between 1 and 1000.' });
    }

    session.attempts -= 1;

    if (guess === session.secret) {
        delete mindreaderSessions[clientId];
        return res.json({ ok: true, attempts: session.attempts, flag: MINDREADER_FLAG });
    }

    if (session.attempts <= 0) {
        delete mindreaderSessions[clientId];
        return res.json({ ok: true, status: 'lost', attempts: 0, message: 'Out of attempts. Better luck next time.' });
    }

    if (guess < session.secret) {
        return res.json({ ok: true, status: 'low', attempts: session.attempts });
    }
    return res.json({ ok: true, status: 'high', attempts: session.attempts });
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

app.get('/download/simple-zip', (req, res) => {
    if (!fs.existsSync(SIMPLE_ZIP_FILE)) {
        return res.status(404).json({ error: 'simple.zip not found' });
    }
    return res.download(SIMPLE_ZIP_FILE, 'simple.zip');
});

app.get('/download/final', (req, res) => {
    if (!fs.existsSync(FINAL_IMAGE_FILE)) {
        return res.status(404).json({ error: 'final.png not found' });
    }
    return res.download(FINAL_IMAGE_FILE, 'final.png');
});

app.use('/robots-ctf', express.static(MBITS_ROBOTS_DIR));

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
    console.log(`Endpoints: /verify, /verify-flag, /overwatch, /overwatch/register, /overwatch/reset, /do-nothing/*, /sudoku/*, /emoji-ctf, /caesar-ctf, /binhexa/*, /hashcrack/*, /mindreader/*, /find-location/*, /morse-ctf/*, /robots-ctf/*, /download/mbits, /download/simple, /download/simple-zip, /download/final, /hogwarts/*, /evilcorp`);
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
