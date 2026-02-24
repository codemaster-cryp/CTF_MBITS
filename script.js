// Fade-in background and init matrix animation
window.addEventListener('load', () => {
    // trigger CSS fade-ins
    document.body.classList.add('loaded');
    initMatrix();
    // animate header and eye with a slight stagger
    setTimeout(() => {
        const hdr = document.querySelector('.glitch');
        if (hdr) hdr.classList.add('glitch-animate');

        const eye = document.getElementById('illuminati-eye');
        if (eye) eye.classList.add('eye-animate');
    }, 520);

    // start subtitle typewriter shortly after other animations
    setTimeout(() => {
        animateSubtitle();
    }, 720);
    // start header decrypt shortly after
    setTimeout(() => {
        decryptHeader();
    }, 600);
});


window.enterCTF = function() {
    
    showEntryModal();
};

function getApiBaseUrl() {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isDev ? 'http://localhost:3000' : window.location.origin;
}

function initMatrix() {
    const canvas = document.getElementById('matrix');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const setSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const chars = '01@#$%&*ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize) + 1;
    const drops = Array(columns).fill(0);

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff99';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
        requestAnimationFrame(draw);
    }
    draw();
}

function animateSubtitle() {
    const sub = document.querySelector('.subtitle');
    if (!sub) return;
    const full = sub.textContent.trim();
    sub.textContent = '';
    sub.classList.add('typing');
    let i = 0;
    (function type() {
        if (i <= full.length) {
            sub.textContent = full.slice(0, i);
            i++;
            setTimeout(type, 35 + Math.random() * 45);
        } else {
            // keep the cursor briefly then remove
            setTimeout(() => {
                sub.classList.remove('typing');
                // signal that subtitle animation is complete
                document.dispatchEvent(new Event('subtitleComplete'));
            }, 900);
        }
    })();
}

/* Decrypt header: show alien glyphs per word, then reveal each word progressively */
function decryptHeader() {
    const hdr = document.querySelector('.glitch');
    if (!hdr) return;
    const full = (hdr.dataset && hdr.dataset.text) ? hdr.dataset.text : hdr.textContent.trim();
    const words = full.split(' ');
    const glyphs = '▲▼◆◇■●○✦✶۝҂ЖЌΨΞΣΩΔλπ¥₪@#%&*<>/\\{}[]~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function randGlyph() { return glyphs.charAt(Math.floor(Math.random() * glyphs.length)); }

    hdr.classList.add('decrypting');
    // initialize with random glyphs
    let display = full.split('').map(ch => ch === ' ' ? ' ' : randGlyph()).join('');
    hdr.textContent = display;

    const revealed = Array(full.length).fill(false);

    let wordIndex = 0;
    function processWord() {
        if (wordIndex >= words.length) {
            hdr.textContent = full;
            hdr.classList.remove('decrypting');
            // signal that decrypt animation is complete
            document.dispatchEvent(new Event('decryptComplete'));
            return;
        }
        // compute start/end indices for this word in the full string
        const start = words.slice(0, wordIndex).join(' ').length + (wordIndex === 0 ? 0 : 1);
        const end = start + words[wordIndex].length;

        // scramble interval for current word
        const scrambleInterval = setInterval(() => {
            const out = full.split('').map((ch, i) => {
                if (ch === ' ') return ' ';
                if (i >= start && i < end && !revealed[i]) return randGlyph();
                return revealed[i] ? ch : randGlyph();
            }).join('');
            hdr.textContent = out;
        }, 30);

        // after a short scramble, reveal letters one by one
        const scrambleDuration = 700;
        setTimeout(() => {
            clearInterval(scrambleInterval);
            let i = start;
            function revealNext() {
                if (i >= end) {
                    wordIndex++;
                    setTimeout(processWord, 180);
                    return;
                }
                revealed[i] = true;
                hdr.textContent = full.split('').map((ch, idx) => ch === ' ' ? ' ' : (revealed[idx] ? ch : randGlyph())).join('');
                i++;
                setTimeout(revealNext, 70 + Math.random() * 60);
            }
            revealNext();
        }, scrambleDuration);
    }

    processWord();
}

// Listen for animation completion events to show modal
document.addEventListener('decryptComplete', checkAndShowModal);
document.addEventListener('subtitleComplete', checkAndShowModal);
let __modalReady = { decrypt: false, subtitle: false };
function checkAndShowModal(e) {
    if (e.type === 'decryptComplete') __modalReady.decrypt = true;
    if (e.type === 'subtitleComplete') __modalReady.subtitle = true;
    if (__modalReady.decrypt && __modalReady.subtitle) {
        // show modal after a tiny delay so animations finish
        setTimeout(showEntryModal, 400);
    }
}

function showEntryModal() {
    const modal = document.getElementById('entry-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    // add jump animation to the card for visual effect
    const card = modal.querySelector('.modal-card');
    if (card) {
        card.classList.add('jump-animate');
    }
    // focus the name input for quick entry
    setTimeout(() => {
        const nameInput = document.getElementById('entry-name');
        if (nameInput) nameInput.focus();
    }, 120);
    // wire up form submit once
    const form = document.getElementById('entry-form');
    const cancel = document.getElementById('modal-cancel');
    if (form && !form._wired) {
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            await submitEntry(form);
        });
        cancel.addEventListener('click', () => {
            modal.setAttribute('aria-hidden', 'true');
        });
        form._wired = true;
    }
}

async function submitEntry(form) {
    const status = document.getElementById('modal-status');
    const name = document.getElementById('entry-name').value.trim();
    const code = document.getElementById('entry-code').value.trim();
    if (!name || !code) {
        status.textContent = 'Please enter both name and pseudocode.';
        return;
    }
    status.innerHTML = '<span class="spinner"></span> Verifying...';
    try {
        const res = await fetch(`${getApiBaseUrl()}/verify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, pseudocode: code })
        });
        if (!res.ok) throw new Error('Server returned ' + res.status);
        const j = await res.json();
        if (j && j.valid) {
            status.style.color = '#bfffcf';
            status.textContent = 'Verified — welcome, ' + name + '.';
            // hide modal after a short pause
            setTimeout(() => {
                document.getElementById('entry-modal').setAttribute('aria-hidden', 'true');
                // navigate to challenges page
                window.location.href = 'control-room-init.html';
            }, 900);
        } else {
            status.style.color = '#ffd1d1';
            status.textContent = j && j.message ? j.message : 'Pseudocode not recognized.';
        }
    } catch (err) {
        status.style.color = '#ffd1d1';
        status.textContent = 'Verification failed. Ensure local server is running.';
        console.error('verify error', err);
    }
}
