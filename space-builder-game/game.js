'use strict';
/*
 * Homeward: build a ship on the grid, then fly it through five sectors to reach Earth.
 *
 * The home page (landing.js) opens this game in an iframe and watches it. When level 5 is won it
 * reads #message-text ("GALAXY SAVED!"), #level-indicator (contains "5/5") and the ship from
 * #build-grid .grid-cell (data-col / data-row plus one cell-<part> class: cockpit, block or
 * thruster-<dir>), then flies that ship on the home page. Keep those hooks working.
 */

const { Engine, Bodies, Body, Composite, Events } = Matter;
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------
const GRID_COLS = 11;
const GRID_ROWS = 9;
const CELL = 28;                 // World size of one grid cell
const STEP = 1000 / 60;          // Fixed physics step (ms)
const DT = 1 / 60;
const THRUST_FORCE = 0.0013;     // Per thruster
const BASE_FUEL = 50;            // Thruster-seconds in the cockpit's own tank
const TANK_FUEL = 40;
const PICKUP_FUEL = 35;
const SURFACE_G = 1.2e-4;        // Gravity at a normal planet's surface (force per unit mass)
const SAFE_IMPACT = 3.2;         // Bumps slower than this (px per step) do no damage
const MAX_SPEED = 15;

const PARTS = {
    cockpit:  { name: 'Cockpit',   mass: 1.2, hp: 4, legacy: 'cockpit', blurb: 'Your pilot. One per ship.' },
    hull:     { name: 'Hull',      mass: 1.0, hp: 3, legacy: 'block',   blurb: 'Armor. Adds hull strength.' },
    thruster: { name: 'Thruster',  mass: 0.6, hp: 1, legacy: 'thruster', dir: true, blurb: 'Pushes the ship. Burns fuel.' },
    tank:     { name: 'Fuel tank', mass: 0.8, hp: 1, legacy: 'block',   blurb: `+${TANK_FUEL} fuel.` },
    blaster:  { name: 'Blaster',   mass: 0.7, hp: 1, legacy: 'block',   dir: true, blurb: 'Space fires. Breaks rocks, rockets, drones.' }
};
const PART_ORDER = ['cockpit', 'hull', 'thruster', 'tank', 'blaster'];
const DIRS = ['up', 'right', 'down', 'left'];
const DIR_VEC = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const DIR_ANGLE = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
const DIR_ARROW = { up: '↑', right: '→', down: '↓', left: '←' };
const MIRROR_DIR = { up: 'up', down: 'down', left: 'right', right: 'left' };
const KEY_DIR = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};

const PALETTES = {
    mint:     ['#9af5cf', '#2f8f6a', '#06241a'],
    purple:   ['#a789dc', '#4b3275', '#130a22'],
    teal:     ['#7fe0da', '#1f6f7a', '#05202a'],
    rose:     ['#ffa3b7', '#a33a5c', '#2a0a18'],
    blue:     ['#8cb8ff', '#2b4fa0', '#08132e'],
    amber:    ['#ffd58a', '#b0702a', '#2e1606'],
    moon:     ['#cfd0dc', '#6d6f84', '#1a1a26']
};

// ------------------------------------------------------------------------------------------------
// Levels
// ------------------------------------------------------------------------------------------------
const LEVELS = [
    {
        name: 'First Light',
        threat: 'Learn to fly. One planet, no enemies.',
        brief: 'Lift off, swing over the planet and slip into the wormhole. Grab the 3 star fragments on the way for a perfect run.',
        hazards: [['Gravity', true]],
        accent: '180, 140, 255',
        bounds: { x0: -700, y0: -1300, x1: 2600, y1: 800 },
        start: { x: 0, y: 0, r: 140 },
        planets: [{ x: 950, y: -170, r: 140, palette: 'purple', bands: true }],
        stars: [[480, -480], [950, -560], [1420, -470]],
        fuel: [],
        goal: { x: 1950, y: -180, r: 70, type: 'wormhole' }
    },
    {
        name: 'Asteroid Drift',
        threat: 'A slow river of rocks blocks the way.',
        brief: 'Thread the asteroid belt. Armor helps, and a blaster can clear a path. A fuel canister floats in the middle of the belt.',
        hazards: [['Asteroids'], ['Gravity', true]],
        accent: '0, 240, 255',
        bounds: { x0: -700, y0: -1300, x1: 3000, y1: 1000 },
        start: { x: 0, y: 0, r: 140 },
        planets: [],
        belt: { x0: 650, y0: -1000, x1: 1900, y1: 650, count: 30 },
        stars: [[820, -620], [1270, 250], [1720, -540]],
        fuel: [[1270, -260]],
        goal: { x: 2450, y: -200, r: 70, type: 'wormhole' }
    },
    {
        name: 'Slingshot',
        threat: 'Two giants with heavy gravity.',
        brief: 'Two gas giants sit right on your route and pull hard. Swing over the first (mind its moon) and under the second, and watch your fuel.',
        hazards: [['Heavy gravity'], ['Orbiting moon']],
        accent: '255, 100, 130',
        bounds: { x0: -700, y0: -1500, x1: 4100, y1: 1400 },
        start: { x: 0, y: 0, r: 140 },
        planets: [
            { x: 1150, y: 40, r: 230, g: 1.6, palette: 'teal', bands: true, ring: true },
            { x: 2450, y: -40, r: 210, g: 1.6, palette: 'rose', bands: true },
            { x: 1150, y: 40, r: 46, palette: 'moon', craters: true, orbit: { radius: 420, period: 15, phase: -1.2 } }
        ],
        stars: [[1150, -560], [1800, 0], [2450, 520]],
        fuel: [[1800, -420]],
        goal: { x: 3500, y: 0, r: 70, type: 'wormhole' }
    },
    {
        name: 'Solar Storm',
        threat: 'Sweeping solar flares and homing rockets.',
        brief: 'The sun throws sweeping flares (watch for the thin warning line) and a moon base fires homing rockets. Blasters can shoot rockets down.',
        hazards: [['Solar flares'], ['Homing rockets'], ['Sun heat']],
        accent: '255, 170, 0',
        bounds: { x0: -700, y0: -1300, x1: 3500, y1: 1300 },
        start: { x: 0, y: 300, r: 140 },
        sun: { x: 1350, y: 0, r: 230, g: 1.8, flares: { count: 3, speed: 0.22, telegraph: 0.9, on: 2.2, off: 1.4 } },
        planets: [{ x: 2350, y: 560, r: 95, palette: 'moon', craters: true, launcher: { interval: 3.2 } }],
        stars: [[720, -470], [1350, -560], [2050, -260]],
        fuel: [[1350, 560]],
        goal: { x: 2950, y: -320, r: 70, type: 'wormhole' }
    },
    {
        name: 'Mothership',
        threat: 'An enemy mothership guards Earth.',
        brief: 'An enemy mothership blocks the way home. Its turrets and drones will hunt you. Shoot them, or just outfly them, and reach Earth.',
        hazards: [['Turrets'], ['Drones'], ['Mothership']],
        accent: '74, 222, 128',
        bounds: { x0: -700, y0: -1300, x1: 3400, y1: 1300 },
        start: { x: 0, y: 0, r: 140 },
        planets: [],
        boss: { x: 1550, y: 0, size: 330 },
        drones: [[1050, -560], [1050, 560], [2050, -560], [2050, 560]],
        stars: [[900, -720], [1550, 620], [2250, -420]],
        fuel: [[950, 480]],
        goal: { x: 2750, y: 0, r: 110, type: 'earth' }
    }
];

// ------------------------------------------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

function starPath(g, x, y, outer, inner) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 4;
        const r = i % 2 === 0 ? outer : inner;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
}

function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

const store = {
    get(key, fallback) {
        try {
            const v = localStorage.getItem('homeward-' + key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        try { localStorage.setItem('homeward-' + key, JSON.stringify(value)); } catch (e) { /* storage off */ }
    }
};

const STAR_SVG = '<svg viewBox="-10 -10 20 20" class="mini-star"><path d="M0 -9 L2.3 -2.3 L9 0 L2.3 2.3 L0 9 L-2.3 2.3 L-9 0 L-2.3 -2.3 Z"/></svg>';

// ------------------------------------------------------------------------------------------------
// Sound: tiny synthesized effects (Web Audio), off with the ♪ button
// ------------------------------------------------------------------------------------------------
const Sound = (() => {
    let ac = null, master = null, thrustGain = null;
    let muted = store.get('muted', false);

    function ensure() {
        if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            ac = new AC();
            master = ac.createGain();
            master.gain.value = muted ? 0 : 0.32;
            master.connect(ac.destination);
            // Engine rumble: looping filtered noise, faded in while thrusting
            const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            const noise = ac.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            const filter = ac.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 420;
            thrustGain = ac.createGain();
            thrustGain.gain.value = 0;
            noise.connect(filter).connect(thrustGain).connect(master);
            noise.start();
        }
        if (ac.state === 'suspended') ac.resume();
        return true;
    }

    function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
        if (!ac || muted) return;
        const t0 = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    function noiseBurst(dur, vol, freq) {
        if (!ac || muted) return;
        const t0 = ac.currentTime;
        const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq, t0);
        filter.frequency.exponentialRampToValueAtTime(60, t0 + dur);
        const gain = ac.createGain();
        gain.gain.value = vol;
        src.connect(filter).connect(gain).connect(master);
        src.start(t0);
    }

    return {
        unlock: ensure,
        isMuted: () => muted,
        toggle() {
            muted = !muted;
            store.set('muted', muted);
            if (ensure()) master.gain.value = muted ? 0 : 0.32;
            return muted;
        },
        thrust(level) {
            if (!thrustGain) return;
            thrustGain.gain.setTargetAtTime(muted ? 0 : level * 0.5, ac.currentTime, 0.05);
        },
        click: () => tone(620, 0.06, 'triangle', 0.15),
        place: () => tone(440, 0.07, 'triangle', 0.16, 660),
        erase: () => tone(300, 0.07, 'triangle', 0.14, 180),
        pickup: () => { tone(880, 0.16, 'sine', 0.22); tone(1320, 0.22, 'sine', 0.2, null, 0.08); },
        fuel: () => tone(520, 0.25, 'sine', 0.2, 900),
        zap: () => tone(1100, 0.1, 'square', 0.05, 320),
        enemyZap: () => tone(500, 0.12, 'sawtooth', 0.05, 200),
        hit: () => noiseBurst(0.25, 0.6, 900),
        boom: () => noiseBurst(0.9, 0.9, 1400),
        pop: () => noiseBurst(0.3, 0.4, 2200),
        warp: () => tone(180, 1.3, 'sine', 0.25, 1400),
        lose: () => { tone(330, 0.3, 'triangle', 0.18, 220); tone(220, 0.5, 'triangle', 0.16, 140, 0.25); },
        win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.18, null, i * 0.1)),
        countdown: (last) => tone(last ? 880 : 520, 0.14, 'sine', 0.18)
    };
})();

// ------------------------------------------------------------------------------------------------
// Part drawing (used for the build grid, the parts list and the flying ship, so they all match)
// Directional parts are drawn facing "up": a thruster that pushes up has its nozzle at the bottom.
// ------------------------------------------------------------------------------------------------
function drawPart(g, type, dir, s, o = {}) {
    const h = s / 2;
    g.save();
    if (dir) g.rotate(DIR_ANGLE[dir]);
    let grad;
    switch (type) {
        case 'cockpit': {
            grad = g.createLinearGradient(0, -h, 0, h);
            grad.addColorStop(0, '#1f7a92');
            grad.addColorStop(1, '#0a2c3a');
            roundRect(g, -h + 1, -h + 1, s - 2, s - 2, s * 0.26);
            g.fillStyle = grad;
            g.fill();
            g.strokeStyle = 'rgba(0, 240, 255, 0.55)';
            g.lineWidth = Math.max(1, s * 0.04);
            g.stroke();
            grad = g.createRadialGradient(-h * 0.2, -h * 0.35, 0, 0, 0, h * 0.85);
            grad.addColorStop(0, '#d8feff');
            grad.addColorStop(0.45, '#2ee6ff');
            grad.addColorStop(1, '#007c9c');
            g.shadowColor = 'rgba(0, 240, 255, 0.85)';
            g.shadowBlur = s * 0.35;
            roundRect(g, -h * 0.6, -h * 0.6, h * 1.2, h * 1.2, s * 0.18);
            g.fillStyle = grad;
            g.fill();
            g.shadowBlur = 0;
            g.fillStyle = 'rgba(255, 255, 255, 0.7)';
            g.beginPath();
            g.ellipse(-h * 0.25, -h * 0.3, h * 0.2, h * 0.11, -0.5, 0, Math.PI * 2);
            g.fill();
            break;
        }
        case 'hull': {
            grad = g.createLinearGradient(0, -h, 0, h);
            grad.addColorStop(0, '#7787ab');
            grad.addColorStop(1, '#3c4864');
            roundRect(g, -h + 1, -h + 1, s - 2, s - 2, s * 0.16);
            g.fillStyle = grad;
            g.fill();
            g.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            g.lineWidth = Math.max(1, s * 0.035);
            roundRect(g, -h * 0.68, -h * 0.68, h * 1.36, h * 1.36, s * 0.1);
            g.stroke();
            g.fillStyle = 'rgba(255, 255, 255, 0.35)';
            for (const [rx, ry] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                g.beginPath();
                g.arc(rx * h * 0.55, ry * h * 0.55, Math.max(0.8, s * 0.035), 0, Math.PI * 2);
                g.fill();
            }
            break;
        }
        case 'tank': {
            grad = g.createLinearGradient(-h, 0, h, 0);
            grad.addColorStop(0, '#6a4fbd');
            grad.addColorStop(0.5, '#c8b2ff');
            grad.addColorStop(1, '#5b41a8');
            roundRect(g, -h * 0.82, -h + 1, h * 1.64, s - 2, s * 0.3);
            g.fillStyle = grad;
            g.fill();
            g.fillStyle = 'rgba(40, 20, 90, 0.38)';
            g.fillRect(-h * 0.82, -h * 0.5, h * 1.64, s * 0.08);
            g.fillRect(-h * 0.82, h * 0.38, h * 1.64, s * 0.08);
            const level = o.fuelLevel === undefined ? 1 : o.fuelLevel;
            g.fillStyle = 'rgba(255, 255, 255, 0.22)';
            roundRect(g, -h * 0.16, -h * 0.3, h * 0.32, h * 0.6, s * 0.06);
            g.fill();
            g.fillStyle = 'rgba(255, 190, 80, 0.9)';
            g.fillRect(-h * 0.1, -h * 0.25 + h * 0.5 * (1 - level), h * 0.2, h * 0.5 * level);
            break;
        }
        case 'thruster': {
            grad = g.createLinearGradient(0, -h, 0, h * 0.2);
            grad.addColorStop(0, '#68759a');
            grad.addColorStop(1, '#353d55');
            roundRect(g, -h * 0.72, -h + 1, h * 1.44, h * 1.15, s * 0.12);
            g.fillStyle = grad;
            g.fill();
            grad = g.createLinearGradient(-h, 0, h, 0);
            grad.addColorStop(0, '#4a5266');
            grad.addColorStop(0.5, '#b8c0d0');
            grad.addColorStop(1, '#4a5266');
            g.beginPath();
            g.moveTo(-h * 0.36, h * 0.1);
            g.lineTo(h * 0.36, h * 0.1);
            g.lineTo(h * 0.86, h - 1);
            g.lineTo(-h * 0.86, h - 1);
            g.closePath();
            g.fillStyle = grad;
            g.fill();
            g.fillStyle = o.firing ? '#ffd27a' : '#1a1d28';
            if (o.firing) {
                g.shadowColor = 'rgba(255, 170, 0, 0.9)';
                g.shadowBlur = s * 0.4;
            }
            g.beginPath();
            g.ellipse(0, h - 2, h * 0.68, h * 0.14, 0, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
            g.fillStyle = 'rgba(255, 170, 0, 0.85)';
            g.fillRect(-h * 0.4, -h * 0.55, h * 0.8, s * 0.07);
            break;
        }
        case 'blaster': {
            grad = g.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#454f6e');
            grad.addColorStop(1, '#232a3e');
            roundRect(g, -h * 0.8, -h * 0.1, h * 1.6, h * 1.08, s * 0.14);
            g.fillStyle = grad;
            g.fill();
            grad = g.createLinearGradient(-h * 0.2, 0, h * 0.2, 0);
            grad.addColorStop(0, '#7d8aa0');
            grad.addColorStop(0.5, '#e2ebf5');
            grad.addColorStop(1, '#7d8aa0');
            g.fillStyle = grad;
            g.fillRect(-h * 0.17, -h + 2, h * 0.34, h * 1.1);
            g.shadowColor = 'rgba(0, 240, 255, 0.95)';
            g.shadowBlur = s * 0.3;
            g.fillStyle = o.cooling ? '#3d6b78' : '#7ff6ff';
            g.beginPath();
            g.arc(0, -h + 3, s * 0.09, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
            break;
        }
    }
    if (o.flash > 0) {
        g.globalAlpha = Math.min(1, o.flash);
        g.fillStyle = '#ffffff';
        g.fillRect(-h, -h, s, s);
        g.globalAlpha = 1;
    }
    g.restore();
}

function parsePart(value) {
    const [type, dir] = value.split('-');
    return { type, dir: dir || null };
}

function legacyClass(value) {
    const { type, dir } = parsePart(value);
    if (type === 'thruster') return `thruster-${dir}`;
    return PARTS[type].legacy;
}

// Draw a part onto a little canvas (build grid cells and the parts list)
function partCanvas(value, sizePx, extraClass) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(sizePx * dpr);
    if (extraClass) c.className = extraClass;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(sizePx / 2, sizePx / 2);
    const { type, dir } = parsePart(value);
    drawPart(g, type, dir, sizePx * 0.92);
    return c;
}

// ------------------------------------------------------------------------------------------------
// Sprites: planets, the sun and Earth are drawn once per level into offscreen canvases
// ------------------------------------------------------------------------------------------------
function makeSprite(size, draw, scale = Math.min(window.devicePixelRatio || 1, 1.5)) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * scale);
    const g = c.getContext('2d');
    g.scale(scale, scale);
    draw(g, size / 2);
    c.worldSize = size;
    return c;
}

function planetSprite(p) {
    const [light, mid, dark] = PALETTES[p.palette] || PALETTES.purple;
    const r = p.r;
    const size = r * (p.ring ? 4.6 : 3.1);
    return makeSprite(size, (g, c) => {
        // Soft glow
        let grad = g.createRadialGradient(c, c, r * 0.9, c, c, r * 1.5);
        grad.addColorStop(0, hexA(light, 0.22));
        grad.addColorStop(1, hexA(light, 0));
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        if (p.ring) drawRing(g, c, r, light, false);
        // Body, lit from the upper left
        grad = g.createRadialGradient(c - r * 0.4, c - r * 0.4, 0, c - r * 0.4, c - r * 0.4, r * 1.98);
        grad.addColorStop(0, light);
        grad.addColorStop(0.5, mid);
        grad.addColorStop(1, dark);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.fill();
        g.save();
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.clip();
        if (p.bands) {
            g.save();
            g.translate(c, c);
            g.rotate(-0.3);
            [[-0.55, 0.2, 0.1], [-0.05, 0.28, 0.07], [0.45, 0.14, 0.09]].forEach(([y, hh, a]) => {
                g.fillStyle = `rgba(255, 255, 255, ${a})`;
                g.fillRect(-r * 1.2, y * r, r * 2.4, hh * r);
            });
            g.restore();
        }
        if (p.craters) {
            const craters = [[-0.35, -0.25, 0.18], [0.3, 0.1, 0.13], [-0.05, 0.45, 0.1], [0.45, -0.4, 0.08]];
            for (const [cx, cy, cr] of craters) {
                g.fillStyle = 'rgba(0, 0, 0, 0.18)';
                g.beginPath();
                g.arc(c + cx * r, c + cy * r, cr * r, 0, Math.PI * 2);
                g.fill();
                g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                g.lineWidth = Math.max(1, r * 0.02);
                g.beginPath();
                g.arc(c + cx * r, c + cy * r, cr * r, Math.PI * 0.9, Math.PI * 1.7);
                g.stroke();
            }
        }
        g.restore();
        if (p.ring) drawRing(g, c, r, light, true);
    });
}

function drawRing(g, c, r, color, front) {
    g.save();
    g.translate(c, c);
    g.rotate(-0.3);
    g.beginPath();
    g.ellipse(0, 0, r * 1.75, r * 0.38, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    g.strokeStyle = hexA(color, 0.35);
    g.lineWidth = r * 0.12;
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, r * 2.05, r * 0.45, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    g.strokeStyle = hexA(color, 0.18);
    g.lineWidth = r * 0.05;
    g.stroke();
    g.restore();
}

function earthSprite(r) {
    const size = r * 3;
    return makeSprite(size, (g, c) => {
        let grad = g.createRadialGradient(c, c, r * 0.95, c, c, r * 1.5);
        grad.addColorStop(0, 'rgba(110, 190, 255, 0.45)');
        grad.addColorStop(1, 'rgba(110, 190, 255, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        grad = g.createRadialGradient(c - r * 0.4, c - r * 0.4, 0, c - r * 0.4, c - r * 0.4, r * 2);
        grad.addColorStop(0, '#5aa8ff');
        grad.addColorStop(0.5, '#1f5fc4');
        grad.addColorStop(1, '#061a45');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.fill();
        g.save();
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.clip();
        // Simple continents
        g.fillStyle = 'rgba(84, 200, 120, 0.85)';
        const blobs = [
            [[-0.6, -0.4], [-0.15, -0.65], [0.1, -0.3], [-0.2, -0.05], [-0.55, -0.1]],
            [[0.15, 0.05], [0.6, -0.1], [0.75, 0.3], [0.4, 0.6], [0.1, 0.4]],
            [[-0.7, 0.35], [-0.35, 0.3], [-0.3, 0.7], [-0.65, 0.65]]
        ];
        for (const blob of blobs) {
            g.beginPath();
            blob.forEach(([x, y], i) => {
                const px = c + x * r, py = c + y * r;
                if (i === 0) g.moveTo(px, py);
                else g.quadraticCurveTo(c + (x + blob[i - 1][0]) * r / 2 + r * 0.08, c + (y + blob[i - 1][1]) * r / 2, px, py);
            });
            g.closePath();
            g.fill();
        }
        // Clouds
        g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        g.lineCap = 'round';
        g.lineWidth = r * 0.07;
        for (const [y, x0, x1] of [[-0.5, -0.2, 0.5], [0.15, -0.8, -0.2], [0.55, 0.0, 0.6]]) {
            g.beginPath();
            g.moveTo(c + x0 * r, c + y * r);
            g.quadraticCurveTo(c + (x0 + x1) / 2 * r, c + (y - 0.08) * r, c + x1 * r, c + y * r);
            g.stroke();
        }
        // Shadow side
        grad = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.3, c, c, r * 1.15);
        grad.addColorStop(0, 'rgba(0, 0, 20, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 20, 0.7)');
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        g.restore();
    });
}

function sunSprite(r) {
    const size = r * 2.2;
    return makeSprite(size, (g, c) => {
        const grad = g.createRadialGradient(c - r * 0.2, c - r * 0.2, 0, c, c, r);
        grad.addColorStop(0, '#fffbe6');
        grad.addColorStop(0.35, '#ffd36b');
        grad.addColorStop(0.75, '#ff8a3d');
        grad.addColorStop(1, '#e8452e');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.fill();
    });
}

function sunGlowSprite(r) {
    // Soft glow is blurry anyway, so it is drawn at half resolution
    return makeSprite(r * 4.4, (g, c) => {
        const grad = g.createRadialGradient(c, c, r * 0.8, c, c, r * 2.1);
        grad.addColorStop(0, 'rgba(255, 170, 60, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 100, 60, 0.12)');
        grad.addColorStop(1, 'rgba(255, 80, 60, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, r * 4.4, r * 4.4);
    }, 0.5);
}

function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Each part look (type, direction, firing, cooling, tank level) is drawn once and reused every frame
const partSprites = new Map();
function partSprite(type, dir, firing, cooling, fuelLevel) {
    const level = type === 'tank' ? Math.round(fuelLevel * 8) / 8 : 1;
    const key = `${type}|${dir}|${firing ? 1 : 0}|${cooling ? 1 : 0}|${level}`;
    let sprite = partSprites.get(key);
    if (!sprite) {
        sprite = makeSprite(CELL * 1.8, (g, c) => {
            g.translate(c, c);
            drawPart(g, type, dir, CELL, { firing, cooling, fuelLevel: level });
        }, Math.min(window.devicePixelRatio || 1, 2) * 1.25);
        partSprites.set(key, sprite);
    }
    return sprite;
}

function bossSprite(b) {
    const size = b.size * 2.4;
    const sprite = makeSprite(size, (g, c) => {
        const v = [[0.5, 0.866], [-1, 0], [0.5, -0.866]].map(([x, y]) => [c + x * b.size, c + y * b.size]);
        const grad = g.createLinearGradient(c - b.size, c, c + b.size * 0.5, c);
        grad.addColorStop(0, '#2a3350');
        grad.addColorStop(1, '#141a2c');
        g.fillStyle = grad;
        g.strokeStyle = 'rgba(255, 100, 130, 0.55)';
        g.lineWidth = 3;
        g.shadowColor = 'rgba(255, 100, 130, 0.45)';
        g.shadowBlur = 30;
        g.beginPath();
        v.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
        g.shadowBlur = 0;
        g.stroke();
        g.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        g.lineWidth = 2;
        for (const k of [0.35, 0.6, 0.85]) {
            g.beginPath();
            g.moveTo(c - b.size + b.size * 1.5 * k, c - b.size * 0.866 * k);
            g.lineTo(c - b.size + b.size * 1.5 * k, c + b.size * 0.866 * k);
            g.stroke();
        }
    });
    return sprite;
}

// ------------------------------------------------------------------------------------------------
// State
// ------------------------------------------------------------------------------------------------
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
const minimap = $('minimap');
const mctx = minimap.getContext('2d');
let W = 0, H = 0, DPR = 1;

let state = 'MENU';          // MENU, BUILD, COUNTDOWN, FLY, WARP, DEAD, RESULT, PAUSED
let pausedFrom = null;
let currentLevel = 0;
let progress = store.get('progress', { unlocked: 0, stars: [0, 0, 0, 0, 0], best: [null, null, null, null, null] });

const gridMap = new Map();   // "col,row" -> "cockpit" | "hull" | "tank" | "thruster-up" | ...
let selectedPart = 'cockpit';
const partDirs = { thruster: 'up', blaster: 'up' };
let mirrorMode = false;
let cellPx = 40;
let cellEls = [];

const input = { up: false, down: false, left: false, right: false, rotL: false, rotR: false, fire: false };

let engine = null;
let ship = null;
let flight = null;               // The current flight world
const cam = { x: 0, y: 0, zoom: 0.8, shake: 0 };
let flashRed = 0;
let menuTime = 0;

const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// Background stars (screen-space layers with parallax)
const bgStars = [];
for (let i = 0; i < 260; i++) {
    bgStars.push({
        x: Math.random(), y: Math.random(),
        layer: i % 3,
        r: Math.random() * 1.3 + 0.3,
        tw: Math.random() * Math.PI * 2
    });
}
const menuPlanet = planetSprite({ r: 150, palette: 'purple', bands: true, ring: true });

// ------------------------------------------------------------------------------------------------
// Screens
// ------------------------------------------------------------------------------------------------
function showScreen(name) {
    for (const id of ['screen-menu', 'screen-build', 'screen-hud']) $(id).classList.add('hidden');
    if (name) $(name).classList.remove('hidden');
}

function fade(callback) {
    const overlay = $('transition-overlay');
    overlay.classList.remove('hidden');
    overlay.style.animation = 'none';
    void overlay.offsetWidth;
    overlay.style.animation = '';
    setTimeout(callback, 220);
    setTimeout(() => overlay.classList.add('hidden'), 520);
}

function hideOverlays() {
    for (const id of ['message-overlay', 'pause-overlay', 'countdown']) $(id).classList.add('hidden');
}

// ------------------------------------------------------------------------------------------------
// Menu
// ------------------------------------------------------------------------------------------------
function renderMenu() {
    const list = $('level-list');
    list.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
        const locked = i > progress.unlocked;
        const card = document.createElement('button');
        card.className = 'level-card' + (locked ? ' locked' : '');
        card.style.setProperty('--accent', lvl.accent);
        const stars = [0, 1, 2].map(k => STAR_SVG.replace('mini-star', 'mini-star' + (k < progress.stars[i] ? ' got' : ''))).join('');
        const best = progress.best[i] ? ` · best ${formatTime(progress.best[i])}` : '';
        card.innerHTML = `
            <span class="lc-num">Level ${i + 1}${best}</span>
            <span class="lc-name">${lvl.name}</span>
            <span class="lc-threat">${lvl.threat}</span>
            <span class="lc-stars">${stars}</span>`;
        card.addEventListener('click', () => {
            Sound.unlock();
            if (locked) {
                Sound.erase();
                return;
            }
            Sound.click();
            openLevel(i);
        });
        list.appendChild(card);
    });
}

function goMenu() {
    fade(() => {
        teardownWorld();
        hideOverlays();
        state = 'MENU';
        renderMenu();
        showScreen('screen-menu');
    });
}

// ------------------------------------------------------------------------------------------------
// Build mode
// ------------------------------------------------------------------------------------------------
function openLevel(i) {
    currentLevel = i;
    fade(() => {
        teardownWorld();
        hideOverlays();
        enterBuild();
    });
}

function enterBuild() {
    state = 'BUILD';
    const lvl = LEVELS[currentLevel];
    $('level-indicator').innerText = `Level ${currentLevel + 1}/5`;
    $('level-name').innerText = lvl.name;
    $('mission-name').innerText = lvl.name;
    $('mission-brief').innerText = lvl.brief;
    $('mission-hazards').innerHTML = lvl.hazards.map(([label, calm]) => `<span class="chip${calm ? ' calm' : ''}">${label}</span>`).join('');
    showScreen('screen-build');
    if (gridMap.size === 0) loadStarterShip(false);
    layoutGrid();
    updateStats();
}

function renderPartsList() {
    const list = $('parts-list');
    list.innerHTML = '';
    PART_ORDER.forEach((type, i) => {
        const def = PARTS[type];
        const btn = document.createElement('button');
        btn.className = 'part-item' + (selectedPart === type ? ' selected' : '');
        btn.dataset.part = type;
        const value = def.dir ? `${type}-${partDirs[type]}` : type;
        btn.appendChild(partCanvas(value, 34));
        const text = document.createElement('span');
        text.className = 'part-text';
        const dirLabel = def.dir ? ` <span style="color:var(--cyan);font-weight:500">${type === 'thruster' ? 'pushes' : 'fires'} ${DIR_ARROW[partDirs[type]]}</span>` : '';
        text.innerHTML = `<span class="part-name">${def.name}${dirLabel}</span><span class="part-blurb">${def.blurb}</span>`;
        btn.appendChild(text);
        const key = document.createElement('span');
        key.className = 'part-key';
        key.textContent = i + 1;
        btn.appendChild(key);
        btn.addEventListener('click', () => {
            Sound.unlock();
            if (selectedPart === type && def.dir) rotateSelected();
            else selectPart(type);
        });
        list.appendChild(btn);
    });
    const eraser = document.createElement('button');
    eraser.className = 'part-item eraser' + (selectedPart === 'eraser' ? ' selected' : '');
    eraser.innerHTML = '<span class="part-icon-x">✕</span><span class="part-text"><span class="part-name">Eraser</span><span class="part-blurb">Remove parts.</span></span><span class="part-key">6</span>';
    eraser.addEventListener('click', () => selectPart('eraser'));
    list.appendChild(eraser);
}

function selectPart(type) {
    selectedPart = type;
    Sound.click();
    renderPartsList();
}

function rotateSelected() {
    if (!PARTS[selectedPart] || !PARTS[selectedPart].dir) return;
    const i = DIRS.indexOf(partDirs[selectedPart]);
    partDirs[selectedPart] = DIRS[(i + 1) % 4];
    Sound.click();
    renderPartsList();
}

function currentPaintValue() {
    const def = PARTS[selectedPart];
    if (!def) return null;
    return def.dir ? `${selectedPart}-${partDirs[selectedPart]}` : selectedPart;
}

function layoutGrid() {
    const container = $('build-grid-container');
    const rect = container.getBoundingClientRect();
    const narrow = window.innerWidth <= 640;
    const availW = Math.max(200, rect.width - 8);
    const availH = narrow ? availW * GRID_ROWS / GRID_COLS : Math.max(160, rect.height - 8);
    cellPx = Math.floor(clamp(Math.min(availW / GRID_COLS, availH / GRID_ROWS), 20, 58));
    const grid = $('build-grid');
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${cellPx}px)`;
    grid.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${cellPx}px)`;
    grid.style.setProperty('--cell', `${cellPx}px`);
    grid.style.backgroundPosition = `${cellPx / 2}px ${cellPx / 2}px`;
    if (narrow) container.style.height = `${cellPx * GRID_ROWS + 4}px`;
    else container.style.height = '';
    grid.innerHTML = '';
    cellEls = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        cellEls[r] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.col = c;
            cell.dataset.row = r;
            grid.appendChild(cell);
            cellEls[r][c] = cell;
        }
    }
    refreshAllCells();
    renderPartsList();
}

function refreshAllCells() {
    const detached = findDetached();
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) refreshCell(c, r, detached);
    }
}

function refreshCell(c, r, detached, pop) {
    const cell = cellEls[r] && cellEls[r][c];
    if (!cell) return;
    const key = `${c},${r}`;
    const value = gridMap.get(key);
    let cls = 'grid-cell';
    if (c === Math.floor(GRID_COLS / 2) && mirrorMode) cls += ' center-col';
    if (value) cls += ` cell-${legacyClass(value)} has-part`;
    if (value && detached.has(key)) cls += ' detached';
    if (pop) cls += ' pop';
    cell.className = cls;
    cell.innerHTML = '';
    if (value) cell.appendChild(partCanvas(value, cellPx));
}

// Parts must connect to the cockpit (side by side) to be part of the ship
function findDetached() {
    const detached = new Set(gridMap.keys());
    let start = null;
    for (const [k, v] of gridMap) if (v === 'cockpit') start = k;
    if (!start) return detached;
    const queue = [start];
    detached.delete(start);
    while (queue.length) {
        const [c, r] = queue.shift().split(',').map(Number);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = `${c + dc},${r + dr}`;
            if (detached.has(k)) {
                detached.delete(k);
                queue.push(k);
            }
        }
    }
    return detached;
}

function setCell(c, r, value) {
    if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) return false;
    const key = `${c},${r}`;
    if (value === null) {
        if (!gridMap.has(key)) return false;
        gridMap.delete(key);
        return true;
    }
    if (gridMap.get(key) === value) return false;
    if (value === 'cockpit') {
        for (const [k, v] of [...gridMap]) if (v === 'cockpit') gridMap.delete(k);
    }
    gridMap.set(key, value);
    return true;
}

function paintAt(c, r, erase) {
    let value = erase ? null : currentPaintValue();
    if (!erase && value === null) return;
    let changed = setCell(c, r, value);
    if (mirrorMode) {
        const mc = GRID_COLS - 1 - c;
        if (mc !== c) {
            let mv = value;
            if (value) {
                const { type, dir } = parsePart(value);
                if (type === 'cockpit') mv = null;
                else if (dir) mv = `${type}-${MIRROR_DIR[dir]}`;
            }
            if (mv !== null || erase) changed = setCell(mc, r, erase ? null : mv) || changed;
        }
    }
    if (changed) {
        erase ? Sound.erase() : Sound.place();
        const detached = findDetached();
        for (let rr = 0; rr < GRID_ROWS; rr++) {
            for (let cc = 0; cc < GRID_COLS; cc++) {
                refreshCell(cc, rr, detached, !erase && rr === r && (cc === c || cc === GRID_COLS - 1 - c));
            }
        }
        updateStats();
    }
}

function loadStarterShip(withSound = true) {
    gridMap.clear();
    const parts = {
        '5,2': 'blaster-up',
        '4,3': 'thruster-down', '5,3': 'cockpit', '6,3': 'thruster-down',
        '3,4': 'thruster-right', '4,4': 'hull', '5,4': 'hull', '6,4': 'hull', '7,4': 'thruster-left',
        '4,5': 'thruster-up', '5,5': 'tank', '6,5': 'thruster-up'
    };
    for (const [k, v] of Object.entries(parts)) gridMap.set(k, v);
    if (withSound) Sound.place();
}

function shipEntries() {
    const out = [];
    for (const [k, v] of gridMap) {
        const [c, r] = k.split(',').map(Number);
        out.push({ c, r, ...parsePart(v) });
    }
    return out;
}

function computeStats() {
    const parts = shipEntries();
    const detached = findDetached();
    const attached = parts.filter(p => !detached.has(`${p.c},${p.r}`));
    let mass = 0, hp = 0, fuel = BASE_FUEL, mx = 0;
    const thrust = { up: 0, down: 0, left: 0, right: 0 };
    let blasters = 0;
    for (const p of attached) {
        const def = PARTS[p.type];
        mass += def.mass;
        hp += def.hp;
        mx += (p.c + 0.5) * def.mass;
        if (p.type === 'tank') fuel += TANK_FUEL;
        if (p.type === 'thruster') thrust[p.dir]++;
        if (p.type === 'blaster') blasters++;
    }
    const comX = mass ? mx / mass : 0;
    // Spin from the up thrusters: how far their push is from the center of mass
    let torque = 0;
    for (const p of attached) if (p.type === 'thruster' && p.dir === 'up') torque += (p.c + 0.5) - comX;
    // Lift: upward push compared to a normal planet's pull (physics mass equals the listed mass)
    const lift = mass ? (thrust.up * THRUST_FORCE / mass) / SURFACE_G : 0;
    return {
        count: attached.length, mass, hp, fuel, thrust, blasters, torque, lift,
        hasCockpit: parts.some(p => p.type === 'cockpit'),
        detached: detached.size
    };
}

function updateStats() {
    const s = computeStats();
    let liftClass = 'bad', liftText = 'Too heavy';
    if (s.lift >= 1.6) { liftClass = 'good'; liftText = 'Strong'; }
    else if (s.lift >= 1.1) { liftClass = 'ok'; liftText = 'Sluggish'; }
    const liftPct = clamp(s.lift / 3, 0, 1) * 100;
    const liftColor = liftClass === 'good' ? 'var(--green)' : liftClass === 'ok' ? 'var(--amber)' : 'var(--rose)';
    let balanceText = 'Balanced', balanceClass = 'good';
    if (s.thrust.up === 0) { balanceText = 'No up thrusters'; balanceClass = 'bad'; }
    else if (Math.abs(s.torque) > 0.6) { balanceText = s.torque > 0 ? 'Tips left' : 'Tips right'; balanceClass = 'ok'; }
    const thrustText = DIRS.map(d => `${DIR_ARROW[d]}${s.thrust[d]}`).join(' ');
    $('ship-stats').innerHTML = `
        <div class="stat"><span class="stat-label">Lift</span><span class="stat-value ${liftClass}">${liftText} · ${s.lift.toFixed(1)}×</span></div>
        <div class="stat-bar"><span style="width:${liftPct}%;background:${liftColor}"></span></div>
        <div class="stat"><span class="stat-label">Balance</span><span class="stat-value ${balanceClass}">${balanceText}</span></div>
        <div class="stat"><span class="stat-label">Thrusters</span><span class="stat-value">${thrustText}</span></div>
        <div class="stat"><span class="stat-label">Hull</span><span class="stat-value">${s.hp}</span></div>
        <div class="stat"><span class="stat-label">Fuel</span><span class="stat-value">${s.fuel}</span></div>
        <div class="stat"><span class="stat-label">Blasters</span><span class="stat-value">${s.blasters || '–'}</span></div>
        <div class="stat"><span class="stat-label">Mass</span><span class="stat-value">${s.mass.toFixed(1)}</span></div>`;
    let warning = '';
    if (!s.hasCockpit) warning = 'Place a cockpit to start your ship.';
    else if (s.detached) warning = `${s.detached} part${s.detached > 1 ? 's are' : ' is'} not attached (shown in red). Connect or erase ${s.detached > 1 ? 'them' : 'it'}.`;
    else if (s.thrust.up + s.thrust.down + s.thrust.left + s.thrust.right === 0) warning = 'Add at least one thruster.';
    else if (s.lift < 1.1) warning = 'Too heavy to lift off. Add up thrusters (↑) or remove weight.';
    $('build-warning').innerText = warning;
    const ok = !warning || warning.startsWith('Too heavy');
    $('btn-play').disabled = !ok;
    $('btn-play').style.opacity = ok ? '1' : '0.5';
    return s;
}

// Painting on the grid with mouse, pen or touch
let painting = false, paintErase = false, lastPaintKey = null;

function cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.classList.contains('grid-cell')) return null;
    return { c: Number(el.dataset.col), r: Number(el.dataset.row), el };
}

$('build-grid').addEventListener('pointerdown', (e) => {
    if (state !== 'BUILD') return;
    Sound.unlock();
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    paintErase = e.button === 2 || e.shiftKey || selectedPart === 'eraser';
    const key = `${hit.c},${hit.r}`;
    const existing = gridMap.get(key);
    // Tapping a placed part of the picked type turns it instead
    if (!paintErase && existing && PARTS[selectedPart] && PARTS[selectedPart].dir && parsePart(existing).type === selectedPart) {
        const { dir } = parsePart(existing);
        const next = DIRS[(DIRS.indexOf(dir) + 1) % 4];
        partDirs[selectedPart] = next;
        renderPartsList();
        paintAt(hit.c, hit.r, false);
        painting = false;
        return;
    }
    painting = true;
    lastPaintKey = key;
    paintAt(hit.c, hit.r, paintErase);
});

window.addEventListener('pointermove', (e) => {
    if (state !== 'BUILD') return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    updateGhost(hit);
    if (!painting || !hit) return;
    const key = `${hit.c},${hit.r}`;
    if (key === lastPaintKey) return;
    lastPaintKey = key;
    paintAt(hit.c, hit.r, paintErase);
});
window.addEventListener('pointerup', () => { painting = false; lastPaintKey = null; });
window.addEventListener('pointercancel', () => { painting = false; lastPaintKey = null; });
$('build-grid').addEventListener('contextmenu', (e) => e.preventDefault());
$('build-grid').addEventListener('pointerleave', () => updateGhost(null));

function updateGhost(hit) {
    const ghost = $('ghost-part');
    const value = currentPaintValue();
    if (!hit || !value || gridMap.has(`${hit.c},${hit.r}`) || isTouch) {
        ghost.classList.add('hidden');
        return;
    }
    const containerRect = $('build-grid-container').getBoundingClientRect();
    const cellRect = hit.el.getBoundingClientRect();
    if (ghost.dataset.value !== value || ghost.dataset.size !== String(cellPx)) {
        const src = partCanvas(value, cellPx);
        ghost.width = src.width;
        ghost.height = src.height;
        ghost.getContext('2d').drawImage(src, 0, 0);
        ghost.dataset.value = value;
        ghost.dataset.size = String(cellPx);
    }
    ghost.style.width = `${cellRect.width}px`;
    ghost.style.height = `${cellRect.height}px`;
    ghost.style.left = `${cellRect.left - containerRect.left}px`;
    ghost.style.top = `${cellRect.top - containerRect.top}px`;
    ghost.classList.remove('hidden');
}

$('btn-rotate').addEventListener('click', () => {
    if (!PARTS[selectedPart] || !PARTS[selectedPart].dir) selectPart('thruster');
    else rotateSelected();
});
$('btn-mirror').addEventListener('click', toggleMirror);
$('btn-starter').addEventListener('click', () => {
    loadStarterShip();
    refreshAllCells();
    updateStats();
});
$('btn-clear').addEventListener('click', () => {
    gridMap.clear();
    Sound.erase();
    refreshAllCells();
    updateStats();
});
$('btn-levels').addEventListener('click', goMenu);
$('btn-play').addEventListener('click', () => {
    Sound.unlock();
    launch();
});

function toggleMirror() {
    mirrorMode = !mirrorMode;
    $('btn-mirror').classList.toggle('active', mirrorMode);
    Sound.click();
    refreshAllCells();
}

// ------------------------------------------------------------------------------------------------
// Flight: world setup
// ------------------------------------------------------------------------------------------------
function launch() {
    const s = updateStats();
    if (!s.hasCockpit || s.detached || s.count < 2) return;
    fade(() => {
        hideOverlays();
        buildWorld();
        showScreen('screen-hud');
        sizeMinimap();
        startCountdown();
    });
}

function teardownWorld() {
    if (engine) {
        Events.off(engine);
        Composite.clear(engine.world, false);
        Engine.clear(engine);
    }
    engine = null;
    ship = null;
    flight = null;
    Sound.thrust(0);
}

function buildWorld() {
    teardownWorld();
    const lvl = LEVELS[currentLevel];
    engine = Engine.create();
    engine.gravity.scale = 0;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    const stats = computeStats();

    flight = {
        lvl,
        t: 0,
        gravityBodies: [],
        planets: [],
        asteroids: [],
        rockets: [],
        drones: [],
        bolts: [],
        enemyBolts: [],
        turrets: [],
        particles: [],
        pickups: [],
        launchers: [],
        sun: null,
        boss: null,
        goal: { ...lvl.goal },
        hp: stats.hp,
        maxHp: stats.hp,
        fuel: stats.fuel,
        maxFuel: stats.fuel,
        stars: 0,
        invuln: 0,
        emptyTime: 0,
        warpT: 0,
        deadT: 0,
        firing: new Set(),
        fireCooldown: 0,
        outside: 0,
        toastTimer: 0,
        lastHit: 0,
        scale: 1
    };

    // Start planet with its launch pad
    const sp = lvl.start;
    addPlanet({ x: sp.x, y: sp.y, r: sp.r, palette: 'mint', craters: false, bands: true });
    const pad = Bodies.rectangle(sp.x, sp.y - sp.r - 4, 150, 14, { isStatic: true, label: 'pad', friction: 0.9 });
    Composite.add(engine.world, pad);
    flight.pad = pad;

    for (const p of lvl.planets || []) addPlanet(p);

    if (lvl.sun) {
        const s = lvl.sun;
        const body = Bodies.circle(s.x, s.y, s.r, { isStatic: true, label: 'sun' });
        Composite.add(engine.world, body);
        flight.sun = { ...s, body, sprite: sunSprite(s.r), glow: sunGlowSprite(s.r), flareT: 0 };
        flight.gravityBodies.push({ x: s.x, y: s.y, r: s.r, g: (s.g || 1) * SURFACE_G, ref: null });
    }

    if (lvl.goal.type === 'earth') flight.goal.sprite = earthSprite(lvl.goal.r);

    if (lvl.belt) {
        const b = lvl.belt;
        for (let i = 0; i < b.count; i++) {
            const r = rand(18, 46);
            let x, y, tries = 0;
            do {
                x = rand(b.x0, b.x1);
                y = rand(b.y0, b.y1);
                tries++;
            } while (tries < 30 && (lvl.stars.some(([sx, sy]) => dist2(x, y, sx, sy) < (r + 70) ** 2) || (lvl.fuel || []).some(([fx, fy]) => dist2(x, y, fx, fy) < (r + 70) ** 2)));
            addAsteroid(x, y, r, b);
        }
    }

    if (lvl.boss) {
        const b = lvl.boss;
        const body = Bodies.polygon(b.x, b.y, 3, b.size, { isStatic: true, label: 'boss' });
        Composite.add(engine.world, body);
        flight.boss = { ...b, body, sprite: bossSprite(b) };
        for (const sign of [-1, 1]) {
            flight.turrets.push({ x: b.x - b.size * 0.25, y: b.y + sign * b.size * 0.433, hp: 5, maxHp: 5, cool: 1.2 + (sign > 0 ? 0.8 : 0), angle: Math.PI, alive: true, nx: -0.866, ny: sign * 0.5 });
        }
    }

    for (const [x, y] of lvl.drones || []) {
        flight.drones.push({ x, y, vx: 0, vy: 0, angle: Math.PI, hp: 2, cool: rand(2, 3.5), seed: Math.random() * 10 });
    }

    lvl.stars.forEach(([x, y], i) => flight.pickups.push({ kind: 'star', x, y, r: 26, i, taken: false }));
    for (const [x, y] of lvl.fuel || []) flight.pickups.push({ kind: 'fuel', x, y, r: 24, taken: false });

    createShip(sp.x, sp.y - sp.r - 11);

    Events.on(engine, 'collisionStart', onCollision);

    cam.x = ship.position.x;
    cam.y = ship.position.y - 60;
    cam.zoom = baseZoom();
    cam.shake = 0;
    $('hud-level').innerText = `Level ${currentLevel + 1} · ${lvl.name}`;
    updateHud();
    for (let i = 0; i < 3; i++) $(`hud-star-${i}`).classList.remove('on');
    $('hud-line-1').classList.remove('on');
    $('hud-line-2').classList.remove('on');
}

function addPlanet(p) {
    const body = Bodies.circle(p.x, p.y, p.r, { isStatic: true, label: 'planet', friction: 0.6 });
    Composite.add(engine.world, body);
    // Orbiting moons circle (cx, cy); they pull at half strength
    const planet = { ...p, body, sprite: planetSprite(p), cx: p.x, cy: p.y };
    flight.planets.push(planet);
    flight.gravityBodies.push({ x: p.x, y: p.y, r: p.r, g: (p.g || 1) * SURFACE_G * (p.orbit ? 0.5 : 1), ref: planet });
    if (p.launcher) {
        flight.launchers.push({ planet, interval: p.launcher.interval, cool: 2.0 });
    }
}

// Asteroids drift on their own (outside the physics engine, which keeps them cheap and their paths
// predictable). The ship bounces off them in collideAsteroids().
function addAsteroid(x, y, r, belt) {
    const outline = [];
    for (let i = 0; i < 11; i++) outline.push(r * rand(0.82, 1.08));
    flight.asteroids.push({
        x, y, r, belt,
        vx: rand(-0.5, 0.5),
        vy: rand(0.3, 0.9) * (Math.random() < 0.5 ? -1 : 1),
        angle: Math.random() * Math.PI * 2,
        av: rand(-0.01, 0.01),
        hp: r > 32 ? 3 : 2,
        sprite: asteroidSprite(r, outline)
    });
}

function asteroidSprite(r, outline) {
    return makeSprite(r * 2.4, (g, c) => {
        const grad = g.createRadialGradient(c - r * 0.4, c - r * 0.4, 0, c, c, r * 1.2);
        grad.addColorStop(0, '#9c99b6');
        grad.addColorStop(1, '#34324a');
        g.fillStyle = grad;
        g.beginPath();
        outline.forEach((rr, i) => {
            const ang = (i / outline.length) * Math.PI * 2;
            const x = c + Math.cos(ang) * rr, y = c + Math.sin(ang) * rr;
            i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(0, 0, 0, 0.2)';
        g.beginPath();
        g.arc(c + r * 0.25, c + r * 0.1, r * 0.22, 0, Math.PI * 2);
        g.arc(c - r * 0.3, c + r * 0.35, r * 0.14, 0, Math.PI * 2);
        g.fill();
    });
}

function createShip(cx, padTop) {
    const detached = findDetached();
    const entries = shipEntries().filter(e => !detached.has(`${e.c},${e.r}`));
    let minC = 99, maxC = -1, maxR = -1;
    for (const e of entries) {
        minC = Math.min(minC, e.c);
        maxC = Math.max(maxC, e.c);
        maxR = Math.max(maxR, e.r);
    }
    const offX = cx - ((minC + maxC + 1) / 2) * CELL;
    const offY = padTop - (maxR + 1) * CELL - 1;
    const bodies = entries.map(e => {
        const b = Bodies.rectangle(offX + e.c * CELL + CELL / 2, offY + e.r * CELL + CELL / 2, CELL, CELL, {
            density: PARTS[e.type].mass / (CELL * CELL),
            friction: 0.5,
            restitution: 0.1
        });
        b.partType = e.type;
        b.partDir = e.dir;
        b.flash = 0;
        b.cool = 0;
        return b;
    });
    if (bodies.length === 1) {
        ship = bodies[0];
    } else {
        ship = Body.create({ parts: bodies, friction: 0.5, restitution: 0.1, frictionAir: 0 });
    }
    ship.label = 'ship';
    Composite.add(engine.world, ship);
    flight.shipRadius = Math.max(...shipParts().map(p => Math.hypot(p.position.x - ship.position.x, p.position.y - ship.position.y))) + CELL;
}

function shipParts() {
    return ship.parts.length > 1 ? ship.parts.slice(1) : [ship];
}

// ------------------------------------------------------------------------------------------------
// Flight: countdown, stepping, hazards
// ------------------------------------------------------------------------------------------------
function startCountdown() {
    state = 'COUNTDOWN';
    const lvl = LEVELS[currentLevel];
    $('countdown-goal').innerText = lvl.goal.type === 'earth' ? 'Reach Earth' : 'Reach the wormhole';
    $('countdown-controls').innerHTML = isTouch
        ? '<span>◀ ▲ ▼ ▶</span><span>Fire thrusters by direction</span><span>↺ ↻</span><span>Turn the ship</span><span>Fire</span><span>Shoot blasters</span>'
        : '<kbd>↑ ↓ ← →</kbd><span>Fire thrusters (or WASD)</span><kbd>Q E</kbd><span>Turn the ship</span><kbd>Space</kbd><span>Shoot blasters</span><kbd>R</kbd><span>Retry · Esc pauses</span>';
    $('countdown').classList.remove('hidden');
    let n = 3;
    const num = $('countdown-number');
    num.innerText = n;
    Sound.countdown(false);
    const tick = () => {
        if (state !== 'COUNTDOWN') return;
        n--;
        if (n > 0) {
            num.innerText = n;
            Sound.countdown(false);
            setTimeout(tick, 650);
        } else {
            num.innerText = 'Go';
            Sound.countdown(true);
            setTimeout(() => {
                if (state !== 'COUNTDOWN') return;
                $('countdown').classList.add('hidden');
                state = 'FLY';
            }, 380);
        }
    };
    setTimeout(tick, 650);
}

function stepWorld() {
    const w = flight;
    w.t += DT;
    if (w.invuln > 0) w.invuln -= DT;
    if (w.fireCooldown > 0) w.fireCooldown -= DT;
    if (w.toastTimer > 0) {
        w.toastTimer -= DT;
        if (w.toastTimer <= 0) $('toast').classList.remove('show');
    }

    // Orbiting moons
    for (const p of w.planets) {
        if (!p.orbit) continue;
        const a = p.orbit.phase + (w.t * Math.PI * 2) / p.orbit.period;
        const nx = p.cx + Math.cos(a) * p.orbit.radius;
        const ny = p.cy + Math.sin(a) * p.orbit.radius;
        Body.setPosition(p.body, { x: nx, y: ny });
        p.x = nx;
        p.y = ny;
    }
    for (const gb of w.gravityBodies) {
        if (gb.ref) {
            gb.x = gb.ref.x;
            gb.y = gb.ref.y;
        }
    }

    if (state === 'FLY' && ship) flyControls(w);
    if (ship && (state === 'FLY' || state === 'WARP')) applyGravity(w);

    updateAsteroids(w);
    updateHazards(w);
    updateBolts(w);
    if (state === 'FLY') {
        checkPickups(w);
        checkGoal(w);
        checkBounds(w);
        checkSun(w);
    }
    if (state === 'WARP') stepWarp(w);
    if (state === 'DEAD') {
        w.deadT += DT;
        if (w.deadT > 1.5 && !w.resultShown) {
            w.resultShown = true;
            showLose(w.deathReason || 'Ship destroyed');
        }
    }

    if (engine) Engine.update(engine, STEP);

    if (ship) {
        for (const p of shipParts()) {
            if (p.flash > 0) p.flash -= DT * 4;
            if (p.cool > 0) p.cool -= DT;
        }
        const v = ship.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed > MAX_SPEED) Body.setVelocity(ship, { x: v.x / speed * MAX_SPEED, y: v.y / speed * MAX_SPEED });
    }
    updateParticles(w);
}

function flyControls(w) {
    const parts = shipParts();
    const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
    w.firing.clear();
    let active = 0;
    if (w.fuel > 0) {
        for (const p of parts) {
            if (p.partType !== 'thruster' || !input[p.partDir]) continue;
            const [dx, dy] = DIR_VEC[p.partDir];
            const fx = (dx * cos - dy * sin) * THRUST_FORCE;
            const fy = (dx * sin + dy * cos) * THRUST_FORCE;
            Body.applyForce(ship, p.position, { x: fx, y: fy });
            w.firing.add(p);
            active++;
            // Exhaust leaves the nozzle on the opposite side
            if (Math.random() < 0.85) {
                const ex = p.position.x - (dx * cos - dy * sin) * CELL * 0.6;
                const ey = p.position.y - (dx * sin + dy * cos) * CELL * 0.6;
                const sp = rand(2.5, 4.5);
                spawn(w, {
                    x: ex, y: ey,
                    vx: ship.velocity.x - (dx * cos - dy * sin) * sp + rand(-0.5, 0.5),
                    vy: ship.velocity.y - (dx * sin + dy * cos) * sp + rand(-0.5, 0.5),
                    life: rand(0.25, 0.45), size: rand(3, 6), color: Math.random() < 0.5 ? '255, 190, 90' : '255, 120, 40', kind: 'glow'
                });
            }
        }
        w.fuel = Math.max(0, w.fuel - active * DT);
        if (w.fuel === 0 && active) toast('Out of fuel', true);
    }
    Sound.thrust(clamp(active / 4, 0, 1));

    // Gyro: Q / E turn the ship, otherwise flight assist slowly stops the spin
    let av = ship.angularVelocity;
    if (input.rotL) av -= 0.0042;
    if (input.rotR) av += 0.0042;
    if (!input.rotL && !input.rotR) av *= 0.86;
    Body.setAngularVelocity(ship, clamp(av, -0.07, 0.07));

    // Blasters
    if (input.fire && w.fireCooldown <= 0) {
        let fired = false;
        for (const p of parts) {
            if (p.partType !== 'blaster') continue;
            const [dx, dy] = DIR_VEC[p.partDir];
            const wx = dx * cos - dy * sin, wy = dx * sin + dy * cos;
            w.bolts.push({ x: p.position.x + wx * CELL * 0.6, y: p.position.y + wy * CELL * 0.6, vx: ship.velocity.x + wx * 13, vy: ship.velocity.y + wy * 13, life: 1.3 });
            p.cool = 0.28;
            fired = true;
        }
        if (fired) {
            w.fireCooldown = 0.28;
            Sound.zap();
        }
    }

    if (w.fuel === 0) {
        w.emptyTime += DT;
        if (w.emptyTime > 9) endFlight('Out of fuel', 'You drifted until the lights went out.');
    } else {
        w.emptyTime = 0;
    }
}

function applyGravity(w) {
    const pos = ship.position;
    for (const gb of w.gravityBodies) {
        const dx = gb.x - pos.x, dy = gb.y - pos.y;
        const d2 = Math.max(dx * dx + dy * dy, gb.r * gb.r);
        const accel = gb.g * gb.r * gb.r / d2;
        const d = Math.sqrt(d2);
        Body.applyForce(ship, pos, { x: dx / d * accel * ship.mass, y: dy / d * accel * ship.mass });
    }
}

function updateAsteroids(w) {
    for (const a of w.asteroids) {
        const b = a.belt, m = a.r + 40;
        a.x += a.vx;
        a.y += a.vy;
        a.angle += a.av;
        if (a.y < b.y0 - m) a.y = b.y1 + m * 0.5;
        else if (a.y > b.y1 + m) a.y = b.y0 - m * 0.5;
        if (a.x < b.x0 - m) a.x = b.x1;
        else if (a.x > b.x1 + m) a.x = b.x0;
    }
    if (ship && state === 'FLY') collideAsteroids(w);
}

// Push the ship out of any asteroid it touches, bounce it off, and do damage on hard hits
function collideAsteroids(w) {
    const sx = ship.position.x, sy = ship.position.y;
    for (const a of w.asteroids) {
        if (dist2(a.x, a.y, sx, sy) > (a.r + w.shipRadius) ** 2) continue;
        for (const p of shipParts()) {
            const dx = p.position.x - a.x, dy = p.position.y - a.y;
            const d = Math.hypot(dx, dy);
            const minD = a.r * 0.9 + CELL * 0.5;
            if (d >= minD || d === 0) continue;
            const nx = dx / d, ny = dy / d;
            const overlap = minD - d;
            Body.setPosition(ship, { x: ship.position.x + nx * overlap, y: ship.position.y + ny * overlap });
            const vn = (ship.velocity.x - a.vx) * nx + (ship.velocity.y - a.vy) * ny;
            if (vn < 0) {
                Body.setVelocity(ship, { x: ship.velocity.x - 1.5 * vn * nx, y: ship.velocity.y - 1.5 * vn * ny });
                const lever = (p.position.x - ship.position.x) * ny - (p.position.y - ship.position.y) * nx;
                Body.setAngularVelocity(ship, clamp(ship.angularVelocity - lever * vn * 0.00035, -0.07, 0.07));
                if (-vn > 1.0) damageShip(-vn > 5 ? 2 : 1, p.position.x - nx * CELL * 0.5, p.position.y - ny * CELL * 0.5, 'An asteroid smashed your ship');
            }
            break;
        }
    }
}

function updateHazards(w) {
    const target = ship && (state === 'FLY') ? ship.position : null;

    // Rocket launchers on planets
    for (const L of w.launchers) {
        L.cool -= DT;
        if (L.cool <= 0 && target && dist2(L.planet.x, L.planet.y, target.x, target.y) < 1500 * 1500) {
            L.cool = L.interval;
            const a = Math.atan2(target.y - L.planet.y, target.x - L.planet.x);
            w.rockets.push({ x: L.planet.x + Math.cos(a) * (L.planet.r + 16), y: L.planet.y + Math.sin(a) * (L.planet.r + 16), angle: a, speed: 3, life: 7.5 });
        }
    }

    // Homing rockets
    for (let i = w.rockets.length - 1; i >= 0; i--) {
        const r = w.rockets[i];
        r.life -= DT;
        r.speed = Math.min(6.2, r.speed + 0.05);
        if (target) {
            let diff = Math.atan2(target.y - r.y, target.x - r.x) - r.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            r.angle += clamp(diff, -0.036, 0.036);
        }
        r.x += Math.cos(r.angle) * r.speed;
        r.y += Math.sin(r.angle) * r.speed;
        if (Math.random() < 0.8) spawn(w, { x: r.x - Math.cos(r.angle) * 12, y: r.y - Math.sin(r.angle) * 12, vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), life: 0.5, size: rand(3, 5), color: '255, 140, 60', kind: 'glow' });
        let gone = r.life <= 0 || hitsSolid(r.x, r.y, 6);
        if (!gone && ship && state === 'FLY' && shipHitAt(r.x, r.y, 10)) {
            damageShip(2, r.x, r.y, 'A rocket got you');
            gone = true;
        }
        if (gone) {
            explode(w, r.x, r.y, 0.7, '255, 150, 70');
            w.rockets.splice(i, 1);
        }
    }

    // Drones
    for (let i = w.drones.length - 1; i >= 0; i--) {
        const d = w.drones[i];
        if (target) {
            const dx = target.x - d.x, dy = target.y - d.y;
            const dist = Math.hypot(dx, dy) || 1;
            const orbitA = w.t * 0.6 + d.seed;
            const want = dist > 900 ? 0 : 1;
            const goalX = target.x - dx / dist * 260 + Math.cos(orbitA) * 120;
            const goalY = target.y - dy / dist * 260 + Math.sin(orbitA) * 120;
            const ax = (goalX - d.x) * 0.0018 * want, ay = (goalY - d.y) * 0.0018 * want;
            d.vx = clamp((d.vx + ax) * 0.985, -4.2, 4.2);
            d.vy = clamp((d.vy + ay) * 0.985, -4.2, 4.2);
            d.angle = Math.atan2(dy, dx);
            d.cool -= DT;
            if (d.cool <= 0 && dist < 760) {
                d.cool = rand(2.4, 3.2);
                const lead = dist / 7.5;
                const tx = target.x + ship.velocity.x * lead, ty = target.y + ship.velocity.y * lead;
                const a = Math.atan2(ty - d.y, tx - d.x);
                w.enemyBolts.push({ x: d.x + Math.cos(a) * 22, y: d.y + Math.sin(a) * 22, vx: Math.cos(a) * 7.5, vy: Math.sin(a) * 7.5, life: 3 });
                Sound.enemyZap();
            }
        } else {
            d.vx *= 0.98;
            d.vy *= 0.98;
        }
        d.x += d.vx;
        d.y += d.vy;
        // Bounce off planets and the mothership
        for (const p of w.planets) {
            const dd = Math.hypot(d.x - p.x, d.y - p.y);
            if (dd < p.r + 24) {
                d.x = p.x + (d.x - p.x) / dd * (p.r + 24);
                d.y = p.y + (d.y - p.y) / dd * (p.r + 24);
                d.vx *= -0.5;
                d.vy *= -0.5;
            }
        }
        if (w.boss && pointInBoss(d.x, d.y, 26)) {
            d.vx = -Math.abs(d.vx) - 1;
        }
        if (ship && state === 'FLY' && shipHitAt(d.x, d.y, 22)) {
            damageShip(1, d.x, d.y, 'A drone rammed you');
            d.hp = 0;
        }
        if (d.hp <= 0) {
            explode(w, d.x, d.y, 1.1, '255, 100, 130');
            Sound.pop();
            w.drones.splice(i, 1);
        }
    }

    // Mothership turrets
    for (const t of w.turrets) {
        if (!t.alive) continue;
        if (target) {
            const want = Math.atan2(target.y - t.y, target.x - t.x);
            let diff = want - t.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            t.angle += clamp(diff, -0.05, 0.05);
            t.cool -= DT;
            if (t.cool <= 0 && dist2(t.x, t.y, target.x, target.y) < 1150 * 1150) {
                t.cool = 2.0;
                for (const spread of [-0.12, 0, 0.12]) {
                    const a = t.angle + spread;
                    w.enemyBolts.push({ x: t.x + Math.cos(a) * 30, y: t.y + Math.sin(a) * 30, vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5, life: 3.2 });
                }
                Sound.enemyZap();
            }
        }
    }

    // Solar flares: beams that sweep around the sun with a warning line first
    if (w.sun && w.sun.flares) {
        const f = w.sun.flares;
        const cycle = f.telegraph + f.on + f.off;
        const ct = w.t % cycle;
        w.sun.phase = ct < f.telegraph ? 'warn' : ct < f.telegraph + f.on ? 'on' : 'off';
        w.sun.beamAngle = w.t * f.speed;
        if (w.sun.phase === 'on' && ship && state === 'FLY') {
            for (let k = 0; k < f.count; k++) {
                const a = w.sun.beamAngle + (k * Math.PI * 2) / f.count;
                const ax = w.sun.x + Math.cos(a) * w.sun.r, ay = w.sun.y + Math.sin(a) * w.sun.r;
                const bx = w.sun.x + Math.cos(a) * 1700, by = w.sun.y + Math.sin(a) * 1700;
                for (const p of shipParts()) {
                    if (distToSegment(p.position.x, p.position.y, ax, ay, bx, by) < CELL * 0.5 + 14) {
                        if (damageShip(2, p.position.x, p.position.y, 'A solar flare hit you')) {
                            const px = ship.position.x - w.sun.x, py = ship.position.y - w.sun.y;
                            const pd = Math.hypot(px, py) || 1;
                            Body.setVelocity(ship, { x: ship.velocity.x + px / pd * 4, y: ship.velocity.y + py / pd * 4 });
                        }
                        break;
                    }
                }
            }
        }
    }

    // Enemy bolts
    for (let i = w.enemyBolts.length - 1; i >= 0; i--) {
        const b = w.enemyBolts[i];
        b.life -= DT;
        b.x += b.vx;
        b.y += b.vy;
        let gone = b.life <= 0 || hitsSolid(b.x, b.y, 4);
        if (!gone && ship && state === 'FLY' && shipHitAt(b.x, b.y, 6)) {
            damageShip(1, b.x, b.y, 'Enemy fire got you');
            gone = true;
        }
        if (gone) {
            spawnBurst(w, b.x, b.y, 6, '255, 100, 130', 2);
            w.enemyBolts.splice(i, 1);
        }
    }
}

function updateBolts(w) {
    for (let i = w.bolts.length - 1; i >= 0; i--) {
        const b = w.bolts[i];
        b.life -= DT;
        b.x += b.vx;
        b.y += b.vy;
        let hit = b.life <= 0;
        // Rockets
        for (let k = w.rockets.length - 1; !hit && k >= 0; k--) {
            const r = w.rockets[k];
            if (dist2(b.x, b.y, r.x, r.y) < 18 * 18) {
                explode(w, r.x, r.y, 0.8, '255, 150, 70');
                Sound.pop();
                w.rockets.splice(k, 1);
                hit = true;
            }
        }
        // Drones
        for (const d of w.drones) {
            if (hit) break;
            if (dist2(b.x, b.y, d.x, d.y) < 26 * 26) {
                d.hp -= 1;
                spawnBurst(w, b.x, b.y, 8, '0, 240, 255', 3);
                hit = true;
            }
        }
        // Turrets
        for (const t of w.turrets) {
            if (hit || !t.alive) continue;
            if (dist2(b.x, b.y, t.x, t.y) < 30 * 30) {
                t.hp -= 1;
                spawnBurst(w, b.x, b.y, 8, '0, 240, 255', 3);
                hit = true;
                if (t.hp <= 0) {
                    t.alive = false;
                    explode(w, t.x, t.y, 1.6, '255, 120, 90');
                    Sound.boom();
                    toast('Turret destroyed');
                }
            }
        }
        // Asteroids
        for (let k = w.asteroids.length - 1; !hit && k >= 0; k--) {
            const a = w.asteroids[k];
            if (dist2(b.x, b.y, a.x, a.y) < (a.r + 4) ** 2) {
                a.hp -= 1;
                hit = true;
                spawnBurst(w, b.x, b.y, 6, '200, 190, 230', 2.5);
                if (a.hp <= 0) {
                    explode(w, a.x, a.y, a.r / 30, '190, 180, 220');
                    Sound.pop();
                    w.asteroids.splice(k, 1);
                }
            }
        }
        if (!hit && hitsSolid(b.x, b.y, 3)) {
            hit = true;
            spawnBurst(w, b.x, b.y, 5, '0, 240, 255', 2);
        }
        if (hit) w.bolts.splice(i, 1);
    }
}

function hitsSolid(x, y, r) {
    for (const p of flight.planets) if (dist2(x, y, p.x, p.y) < (p.r + r) ** 2) return true;
    if (flight.sun && dist2(x, y, flight.sun.x, flight.sun.y) < (flight.sun.r + r) ** 2) return true;
    if (flight.boss && pointInBoss(x, y, r)) return true;
    return false;
}

function pointInBoss(x, y, pad) {
    const b = flight.boss;
    if (!b) return false;
    const v = b.body.vertices;
    // Inside the triangle (same side of every edge), or within pad of its edges
    let pos = 0, neg = 0;
    for (let i = 0; i < v.length; i++) {
        const a = v[i], c = v[(i + 1) % v.length];
        const cross = (c.x - a.x) * (y - a.y) - (c.y - a.y) * (x - a.x);
        if (cross > 0) pos++;
        else if (cross < 0) neg++;
    }
    if (pos === 0 || neg === 0) return true;
    for (let i = 0; i < v.length; i++) {
        const a = v[i], c = v[(i + 1) % v.length];
        if (distToSegment(x, y, a.x, a.y, c.x, c.y) < pad) return true;
    }
    return false;
}

function shipHitAt(x, y, r) {
    for (const p of shipParts()) {
        if (dist2(x, y, p.position.x, p.position.y) < (CELL * 0.55 + r) ** 2) return true;
    }
    return false;
}

function checkPickups(w) {
    for (const p of w.pickups) {
        if (p.taken) continue;
        if (!shipHitAt(p.x, p.y, p.r * 0.7)) continue;
        p.taken = true;
        if (p.kind === 'star') {
            w.stars++;
            Sound.pickup();
            spawnBurst(w, p.x, p.y, 22, '255, 224, 138', 4);
            spawn(w, { x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, size: 10, color: '255, 224, 138', kind: 'ring' });
            const n = w.stars;
            $(`hud-star-${n - 1}`).classList.add('on');
            if (n >= 2) $('hud-line-1').classList.add('on');
            if (n >= 3) $('hud-line-2').classList.add('on');
            toast(n === 3 ? 'All 3 star fragments!' : `Star fragment ${n}/3`);
        } else {
            w.fuel = Math.min(w.maxFuel + PICKUP_FUEL, w.fuel + PICKUP_FUEL);
            w.maxFuel = Math.max(w.maxFuel, Math.ceil(w.fuel));
            Sound.fuel();
            spawnBurst(w, p.x, p.y, 16, '255, 190, 90', 3);
            toast(`+${PICKUP_FUEL} fuel`);
        }
    }
}

function checkGoal(w) {
    const g = w.goal;
    if (dist2(ship.position.x, ship.position.y, g.x, g.y) < (g.r * 0.85) ** 2) {
        state = 'WARP';
        w.warpT = 0;
        w.firing.clear();
        Sound.thrust(0);
        Sound.warp();
    }
}

function checkBounds(w) {
    const b = w.lvl.bounds;
    const { x, y } = ship.position;
    const out = Math.max(b.x0 - x, x - b.x1, b.y0 - y, y - b.y1, 0);
    w.outside = out;
    if (out > 0) {
        // Gentle pull back toward the mission area
        const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1;
        Body.applyForce(ship, ship.position, { x: dx / d * ship.mass * 6e-5, y: dy / d * ship.mass * 6e-5 });
        if (w.toastTimer <= 0) toast('Leaving the mission area', true);
        if (out > 650) endFlight('Lost in deep space', 'You drifted too far from the mission area.');
    }
}

function checkSun(w) {
    if (!w.sun) return;
    const s = w.sun;
    for (const p of shipParts()) {
        if (dist2(p.position.x, p.position.y, s.x, s.y) < (s.r + CELL * 0.9) ** 2) {
            if (damageShip(2, p.position.x, p.position.y, 'You flew into the sun')) {
                const px = ship.position.x - s.x, py = ship.position.y - s.y, d = Math.hypot(px, py) || 1;
                Body.setVelocity(ship, { x: px / d * 6, y: py / d * 6 });
            }
            return;
        }
    }
}

function stepWarp(w) {
    w.warpT += DT;
    const g = w.goal;
    const t = Math.min(1, w.warpT / 1.3);
    const x = lerp(ship.position.x, g.x, 0.08);
    const y = lerp(ship.position.y, g.y, 0.08);
    Body.setPosition(ship, { x, y });
    Body.setVelocity(ship, { x: 0, y: 0 });
    Body.setAngularVelocity(ship, 0.05 + t * 0.25);
    w.scale = 1 - t * 0.95;
    if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const rr = g.r * rand(1, 1.8);
        spawn(w, { x: g.x + Math.cos(a) * rr, y: g.y + Math.sin(a) * rr, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 3, life: 0.5, size: rand(2, 4), color: g.type === 'earth' ? '150, 210, 255' : '0, 240, 255', kind: 'glow' });
    }
    if (w.warpT > 1.35 && !w.resultShown) {
        w.resultShown = true;
        showWin();
    }
}

function damageShip(amount, x, y, reason) {
    const w = flight;
    if (!w || state !== 'FLY' || w.invuln > 0) return false;
    w.hp = Math.max(0, w.hp - amount);
    w.invuln = 0.7;
    cam.shake = Math.min(18, 6 + amount * 5);
    flashRed = 0.5;
    Sound.hit();
    spawnBurst(w, x, y, 14, '255, 200, 120', 4);
    let nearest = null, nd = Infinity;
    for (const p of shipParts()) {
        const d = dist2(x, y, p.position.x, p.position.y);
        if (d < nd) { nd = d; nearest = p; }
    }
    if (nearest) nearest.flash = 1;
    if (w.hp <= 0) destroyShip(reason);
    return true;
}

function destroyShip(reason) {
    const w = flight;
    state = 'DEAD';
    w.deathReason = reason || 'Ship destroyed';
    w.deadT = 0;
    Sound.thrust(0);
    Sound.boom();
    cam.shake = 24;
    for (const p of shipParts()) {
        const dx = p.position.x - ship.position.x, dy = p.position.y - ship.position.y;
        const d = Math.hypot(dx, dy) || 1;
        spawn(w, {
            x: p.position.x, y: p.position.y,
            vx: ship.velocity.x + dx / d * rand(1.5, 4) + rand(-1, 1),
            vy: ship.velocity.y + dy / d * rand(1.5, 4) + rand(-1, 1),
            life: rand(1.6, 2.4), size: CELL, kind: 'debris', type: p.partType, dir: p.partDir,
            rot: ship.angle, vr: rand(-0.15, 0.15)
        });
    }
    explode(w, ship.position.x, ship.position.y, 2.4, '255, 170, 90');
    Composite.remove(engine.world, ship);
    w.shipGone = true;
}

function endFlight(title, detail) {
    if (state !== 'FLY') return;
    state = 'DEAD';
    flight.deathReason = title;
    flight.deathDetail = detail;
    flight.deadT = 0.6;
    Sound.thrust(0);
}

function onCollision(ev) {
    if (!ship || state !== 'FLY') return;
    for (const pair of ev.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        const aShip = a.parent === ship, bShip = b.parent === ship;
        if (aShip === bShip) continue;
        const other = (aShip ? b : a).parent;
        const part = aShip ? a : b;
        const n = pair.collision.normal;
        const ov = other.velocity || { x: 0, y: 0 };
        const vn = Math.abs((ship.velocity.x - ov.x) * n.x + (ship.velocity.y - ov.y) * n.y);
        const where = part.position;
        if (other.label === 'pad') {
            if (vn > 6) damageShip(1, where.x, where.y, 'Hard landing');
        } else if (other.label === 'planet' || other.label === 'boss') {
            if (vn > SAFE_IMPACT) {
                const dmg = 1 + Math.floor((vn - SAFE_IMPACT) / 2.4);
                damageShip(Math.min(dmg, 4), where.x, where.y, other.label === 'boss' ? 'You crashed into the mothership' : 'You crashed into a planet');
            }
        }
    }
}

// ------------------------------------------------------------------------------------------------
// Particles
// ------------------------------------------------------------------------------------------------
function spawn(w, p) {
    if (w.particles.length > 900) return;
    p.max = p.life;
    w.particles.push(p);
}

function spawnBurst(w, x, y, count, color, speed) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.4, 1) * speed;
        spawn(w, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), size: rand(2, 4), color, kind: Math.random() < 0.5 ? 'spark' : 'glow' });
    }
}

function explode(w, x, y, scale, color) {
    spawn(w, { x, y, vx: 0, vy: 0, life: 0.45, size: 20 * scale, color, kind: 'ring' });
    spawn(w, { x, y, vx: 0, vy: 0, life: 0.35, size: 34 * scale, color: '255, 255, 230', kind: 'glow' });
    spawnBurst(w, x, y, Math.round(14 * scale) + 6, color, 3.5 * Math.sqrt(scale));
    for (let i = 0; i < 5 * scale; i++) {
        spawn(w, { x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-1, 1), vy: rand(-1, 1), life: rand(0.8, 1.4), size: rand(10, 22) * scale, color: '120, 110, 150', kind: 'smoke' });
    }
}

function updateParticles(w) {
    for (let i = w.particles.length - 1; i >= 0; i--) {
        const p = w.particles[i];
        p.life -= DT;
        if (p.life <= 0) {
            w.particles.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind !== 'debris') {
            p.vx *= 0.97;
            p.vy *= 0.97;
        }
        if (p.vr) p.rot += p.vr;
    }
}

// ------------------------------------------------------------------------------------------------
// Results, pause and HUD
// ------------------------------------------------------------------------------------------------
function toast(text, warn) {
    const t = $('toast');
    t.innerText = text;
    t.classList.toggle('warn', !!warn);
    t.classList.add('show');
    if (flight) flight.toastTimer = 1.8;
}

function updateHud() {
    const w = flight;
    if (!w) return;
    const hullPct = clamp(w.hp / w.maxHp, 0, 1) * 100;
    const fuelPct = clamp(w.fuel / w.maxFuel, 0, 1) * 100;
    const hull = $('hull-fill'), fuel = $('fuel-fill');
    hull.style.width = `${hullPct}%`;
    fuel.style.width = `${fuelPct}%`;
    hull.classList.toggle('low', hullPct <= 30);
    fuel.classList.toggle('low', fuelPct <= 20);
    $('hud-time').innerText = formatTime(w.t);
}

function resultStars(n) {
    return [0, 1, 2].map(k => {
        const got = k < n;
        return `<svg viewBox="-10 -10 20 20" class="${got ? 'got' : ''}" style="animation-delay:${0.15 + k * 0.15}s"><path style="animation-delay:${0.15 + k * 0.15}s" d="M0 -9 L2.3 -2.3 L9 0 L2.3 2.3 L0 9 L-2.3 2.3 L-9 0 L-2.3 -2.3 Z"/></svg>`;
    }).join('');
}

function showWin() {
    const w = flight;
    const i = currentLevel;
    const final = i === LEVELS.length - 1;
    state = 'RESULT';
    progress.stars[i] = Math.max(progress.stars[i], w.stars);
    progress.best[i] = progress.best[i] ? Math.min(progress.best[i], w.t) : w.t;
    progress.unlocked = Math.max(progress.unlocked, Math.min(i + 1, LEVELS.length - 1));
    store.set('progress', progress);
    $('level-indicator').innerText = `Level ${i + 1}/5`;

    const overlay = $('message-overlay');
    overlay.className = 'overlay ' + (final ? 'final' : 'win');
    $('message-eyebrow').innerText = final ? 'You made it home' : `Level ${i + 1} complete`;
    $('message-text').innerText = final ? 'GALAXY SAVED!' : 'Wormhole reached';
    $('message-stars').innerHTML = resultStars(w.stars);
    const hullLeft = Math.round((w.hp / w.maxHp) * 100);
    $('message-detail').innerText = final
        ? `Time ${formatTime(w.t)} · hull ${hullLeft}%. Close the game and your ship will be floating on the home page.`
        : `Time ${formatTime(w.t)} · hull ${hullLeft}% · ${w.stars}/3 star fragments`;
    const buttons = $('message-buttons');
    buttons.innerHTML = '';
    if (final) {
        addButton(buttons, 'Levels', 'btn-primary', goMenu);
        addButton(buttons, 'Fly again', 'btn-secondary', retryFlight);
    } else {
        addButton(buttons, 'Next level', 'btn-primary', () => openLevel(i + 1));
        addButton(buttons, 'Retry', 'btn-secondary', retryFlight);
        addButton(buttons, 'Rebuild', 'btn-secondary', backToBuild);
    }
    overlay.classList.remove('hidden');
    Sound.win();
    if (final && typeof confetti === 'function') {
        const colors = ['#6C63FF', '#00f0ff', '#b48cff', '#ffaa00', '#ff6482'];
        const end = Date.now() + 2500;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
            confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    }
}

function showLose(reason) {
    const w = flight;
    state = 'RESULT';
    const overlay = $('message-overlay');
    overlay.className = 'overlay lose';
    $('message-eyebrow').innerText = `Level ${currentLevel + 1} · ${LEVELS[currentLevel].name}`;
    $('message-text').innerText = reason;
    $('message-stars').innerHTML = '';
    $('message-detail').innerText = w.deathDetail || tipFor(reason);
    const buttons = $('message-buttons');
    buttons.innerHTML = '';
    addButton(buttons, 'Retry', 'btn-primary', retryFlight);
    addButton(buttons, 'Rebuild', 'btn-secondary', backToBuild);
    addButton(buttons, 'Levels', 'btn-secondary', goMenu);
    overlay.classList.remove('hidden');
    Sound.lose();
}

function tipFor(reason) {
    if (/asteroid/i.test(reason)) return 'Tip: hull blocks soak up hits, and a blaster can clear rocks out of the way.';
    if (/sun|flare/i.test(reason)) return 'Tip: wait for the warning line to pass, then cross behind the flare.';
    if (/rocket|drone|fire|turret|mothership/i.test(reason)) return 'Tip: blasters shoot down rockets and drones. More hull helps you survive a few hits.';
    if (/planet|landing/i.test(reason)) return 'Tip: slow down near planets. Down thrusters (↓) work as brakes.';
    return 'Tip: tweak your ship and try again.';
}

function addButton(parent, label, cls, onClick) {
    const b = document.createElement('button');
    b.className = cls;
    b.innerText = label;
    b.addEventListener('click', () => {
        Sound.click();
        onClick();
    });
    parent.appendChild(b);
}

function retryFlight() {
    fade(() => {
        hideOverlays();
        buildWorld();
        showScreen('screen-hud');
        sizeMinimap();
        startCountdown();
    });
}

function backToBuild() {
    fade(() => {
        teardownWorld();
        hideOverlays();
        enterBuild();
    });
}

function pause() {
    if (state !== 'FLY' && state !== 'COUNTDOWN') return;
    pausedFrom = state === 'COUNTDOWN' ? 'FLY' : state;
    state = 'PAUSED';
    $('countdown').classList.add('hidden');
    Sound.thrust(0);
    $('pause-overlay').classList.remove('hidden');
}

function resume() {
    if (state !== 'PAUSED') return;
    $('pause-overlay').classList.add('hidden');
    state = pausedFrom || 'FLY';
}

$('btn-pause').addEventListener('click', pause);
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', retryFlight);
$('btn-rebuild').addEventListener('click', backToBuild);
$('btn-quit').addEventListener('click', goMenu);

// ------------------------------------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------------------------------------
function baseZoom() {
    return clamp(Math.sqrt(W * H) / 980, 0.42, 1.05);
}

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    sizeMinimap();
    if (state === 'BUILD') layoutGrid();
}

function sizeMinimap() {
    const mw = minimap.clientWidth || 170, mh = minimap.clientHeight || 120;
    minimap.width = Math.round(mw * DPR);
    minimap.height = Math.round(mh * DPR);
}
window.addEventListener('resize', () => {
    clearTimeout(resize.t);
    resize.t = setTimeout(resize, 120);
});

// Soft nebula glows, drawn once per screen size and drifted slightly with the camera
let nebula = null;
function nebulaLayer() {
    if (nebula && nebula.w === W && nebula.h === H) return nebula.canvas;
    const c = document.createElement('canvas');
    const mw = W + 240, mh = H + 240;
    c.width = Math.ceil(mw / 2);
    c.height = Math.ceil(mh / 2);
    const g = c.getContext('2d');
    g.scale(0.5, 0.5);
    for (const [gx, gy, color, a] of [[0.2, 0.25, '108, 99, 255', 0.1], [0.82, 0.7, '0, 240, 255', 0.06], [0.6, 0.15, '255, 100, 130', 0.05]]) {
        const x = gx * mw, y = gy * mh, r = Math.max(mw, mh) * 0.55;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${color}, ${a})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, mw, mh);
    }
    nebula = { w: W, h: H, canvas: c };
    return c;
}

function drawBackground(camX, camY, t) {
    ctx.fillStyle = '#03020A';
    ctx.fillRect(0, 0, W, H);
    const ox = -120 + clamp(-camX * 0.025, -110, 110), oy = -120 + clamp(-camY * 0.025, -110, 110);
    ctx.drawImage(nebulaLayer(), ox, oy, W + 240, H + 240);
    const par = [0.05, 0.12, 0.25];
    for (const s of bgStars) {
        const p = par[s.layer];
        const x = ((s.x * W * 1.2 - camX * p) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * 0.1;
        const y = ((s.y * H * 1.2 - camY * p) % (H * 1.2) + H * 1.2) % (H * 1.2) - H * 0.1;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + s.tw));
        const r = s.r * (0.7 + s.layer * 0.25);
        ctx.fillStyle = `rgba(255, 255, 255, ${tw * (0.35 + s.layer * 0.22)})`;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
}

function drawSprite(sprite, x, y, rot) {
    const s = sprite.worldSize;
    if (rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
    } else {
        ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
    }
}

function drawWormhole(g, t) {
    const { x, y, r } = g;
    let grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    grad.addColorStop(0.4, 'rgba(108, 99, 255, 0.16)');
    grad.addColorStop(1, 'rgba(108, 99, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        const rr = r * (0.3 + i * 0.17);
        const a0 = t * (1.8 - i * 0.22) + i * 1.3;
        ctx.strokeStyle = i % 2 ? `rgba(180, 140, 255, ${0.75 - i * 0.1})` : `rgba(0, 240, 255, ${0.85 - i * 0.1})`;
        ctx.lineWidth = r * 0.07;
        ctx.beginPath();
        ctx.arc(0, 0, rr, a0, a0 + Math.PI * 1.25);
        ctx.stroke();
    }
    grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    grad.addColorStop(0, '#03020A');
    grad.addColorStop(1, 'rgba(3, 2, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSun(s, t) {
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(pulse, pulse);
    drawSprite(s.glow, 0, 0, 0);
    ctx.restore();
    drawSprite(s.sprite, s.x, s.y, 0);
    let grad;
    if (!s.flares) return;
    const f = s.flares;
    for (let k = 0; k < f.count; k++) {
        const a = (s.beamAngle || 0) + (k * Math.PI * 2) / f.count;
        const ax = s.x + Math.cos(a) * s.r, ay = s.y + Math.sin(a) * s.r;
        const bx = s.x + Math.cos(a) * 1700, by = s.y + Math.sin(a) * 1700;
        if (s.phase === 'warn') {
            ctx.setLineDash([16, 14]);
            ctx.strokeStyle = 'rgba(255, 170, 60, 0.45)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (s.phase === 'on') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            grad = ctx.createLinearGradient(ax, ay, bx, by);
            grad.addColorStop(0, 'rgba(255, 220, 140, 0.95)');
            grad.addColorStop(0.6, 'rgba(255, 120, 60, 0.6)');
            grad.addColorStop(1, 'rgba(255, 80, 60, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 34;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 12;
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawBoss(b, t) {
    ctx.save();
    drawSprite(b.sprite, b.x, b.y, 0);
    // Glowing core eye
    const ex = b.x - b.size * 0.48, ey = b.y;
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    let eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 70);
    eg.addColorStop(0, `rgba(255, 90, 110, ${0.9 * pulse})`);
    eg.addColorStop(1, 'rgba(255, 90, 110, 0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(ex, ey, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd0d8';
    ctx.beginPath();
    ctx.arc(ex, ey, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTurret(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = t.alive ? '#323b58' : '#1c2133';
    ctx.strokeStyle = t.alive ? 'rgba(255, 100, 130, 0.7)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (t.alive) {
        ctx.rotate(t.angle);
        ctx.fillStyle = '#9aa6bf';
        ctx.fillRect(4, -5, 30, 10);
        ctx.fillStyle = 'rgba(255, 90, 110, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff5a6e';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawDrone(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.fillStyle = '#1d2236';
    ctx.strokeStyle = 'rgba(255, 100, 130, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-14, -16);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 90, 110, 0.3)';
    ctx.beginPath();
    ctx.arc(6, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawRocket(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.globalCompositeOperation = 'lighter';
    const fl = 10 + Math.random() * 8;
    const grad = ctx.createLinearGradient(-10, 0, -10 - fl, 0);
    grad.addColorStop(0, 'rgba(255, 200, 120, 0.9)');
    grad.addColorStop(1, 'rgba(255, 90, 40, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-10 - fl, 0);
    ctx.lineTo(-10, 4);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9dee8';
    roundRect(ctx, -11, -5, 20, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.moveTo(9, -5);
    ctx.lineTo(16, 0);
    ctx.lineTo(9, 5);
    ctx.fill();
    ctx.restore();
}

function drawAsteroid(a) {
    drawSprite(a.sprite, a.x, a.y, a.angle);
}

function drawPickup(p, t) {
    if (p.taken) return;
    const bob = Math.sin(t * 2.4 + p.x) * 5;
    if (p.kind === 'star') {
        const tw = 0.85 + 0.15 * Math.sin(t * 5 + p.i);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 60);
        grad.addColorStop(0, 'rgba(255, 224, 138, 0.45)');
        grad.addColorStop(1, 'rgba(255, 224, 138, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255, 211, 107, 0.35)';
        starPath(ctx, p.x, p.y + bob, 30 * tw, 8);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        starPath(ctx, p.x, p.y + bob, 22 * tw, 5);
        ctx.fill();
    } else {
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Math.sin(t) * 0.3);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        glow.addColorStop(0, 'rgba(255, 170, 0, 0.35)');
        glow.addColorStop(1, 'rgba(255, 170, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createLinearGradient(-12, 0, 12, 0);
        grad.addColorStop(0, '#c26a00');
        grad.addColorStop(0.5, '#ffcf6b');
        grad.addColorStop(1, '#c26a00');
        ctx.fillStyle = grad;
        roundRect(ctx, -12, -18, 24, 36, 9);
        ctx.fill();
        ctx.fillStyle = 'rgba(60, 30, 0, 0.6)';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', 0, 1);
        ctx.restore();
    }
}

function drawShip(w, t) {
    if (!ship || w.shipGone) return;
    const parts = shipParts();
    const blink = w.invuln > 0 && Math.floor(t * 18) % 2 === 0;
    ctx.save();
    if (w.scale !== 1) {
        ctx.translate(ship.position.x, ship.position.y);
        ctx.scale(w.scale, w.scale);
        ctx.translate(-ship.position.x, -ship.position.y);
    }
    // Flames first so they sit behind the nozzles
    const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of w.firing) {
        const [dx, dy] = DIR_VEC[p.partDir];
        const wx = -(dx * cos - dy * sin), wy = -(dx * sin + dy * cos);
        const nx = p.position.x + wx * CELL * 0.45, ny = p.position.y + wy * CELL * 0.45;
        const len = CELL * (1.0 + Math.random() * 0.6);
        const grad = ctx.createLinearGradient(nx, ny, nx + wx * len, ny + wy * len);
        grad.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
        grad.addColorStop(0.4, 'rgba(255, 170, 0, 0.75)');
        grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = grad;
        const px = -wy * CELL * 0.32, py = wx * CELL * 0.32;
        ctx.beginPath();
        ctx.moveTo(nx + px, ny + py);
        ctx.lineTo(nx + wx * len, ny + wy * len);
        ctx.lineTo(nx - px, ny - py);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const fuelLevel = clamp(w.fuel / w.maxFuel, 0, 1);
    for (const p of parts) {
        const sprite = partSprite(p.partType, p.partDir, w.firing.has(p), p.cool > 0, fuelLevel);
        const sz = sprite.worldSize;
        ctx.save();
        ctx.translate(p.position.x, p.position.y);
        ctx.rotate(ship.angle);
        if (blink) ctx.globalAlpha = 0.55;
        ctx.drawImage(sprite, -sz / 2, -sz / 2, sz, sz);
        if (p.flash > 0) {
            ctx.globalAlpha = Math.min(1, p.flash);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-CELL / 2, -CELL / 2, CELL, CELL);
        }
        ctx.restore();
    }
    ctx.restore();
}

function drawParticles(w) {
    for (const p of w.particles) {
        const k = p.life / p.max;
        if (p.kind === 'glow') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(${p.color}, ${k * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
            ctx.fill();
        } else if (p.kind === 'spark') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(${p.color}, ${k})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
            ctx.stroke();
        } else if (p.kind === 'ring') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(${p.color}, ${k})`;
            ctx.lineWidth = 3 * k + 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (2.2 - k * 1.6), 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.kind === 'smoke') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(${p.color}, ${k * 0.25})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2);
            ctx.fill();
        } else if (p.kind === 'debris') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            ctx.globalAlpha = Math.min(1, k * 2);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            const sprite = partSprite(p.type, p.dir, false, false, 0.5);
            ctx.drawImage(sprite, -sprite.worldSize / 2, -sprite.worldSize / 2, sprite.worldSize, sprite.worldSize);
            ctx.restore();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
}

function drawBolts(w) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of w.bolts) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 1.4, b.y - b.vy * 1.4);
        ctx.stroke();
    }
    for (const b of w.enemyBolts) {
        ctx.fillStyle = 'rgba(255, 90, 110, 0.9)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 90, 110, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
}

function drawBounds(w) {
    if (w.outside <= 0 && !nearBounds(w)) return;
    const b = w.lvl.bounds;
    ctx.save();
    ctx.setLineDash([24, 18]);
    ctx.strokeStyle = 'rgba(255, 100, 130, 0.35)';
    ctx.lineWidth = 3 / cam.zoom;
    ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.restore();
}

function nearBounds(w) {
    if (!ship) return false;
    const b = w.lvl.bounds;
    const { x, y } = ship.position;
    return Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y) < 350;
}

function drawGoalArrow(w) {
    const g = w.goal;
    const sx = (g.x - cam.x) * cam.zoom + W / 2;
    const sy = (g.y - cam.y) * cam.zoom + H / 2;
    const m = 46;
    if (sx > m && sx < W - m && sy > m && sy < H - m) return;
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const ex = clamp(W / 2 + Math.cos(a) * W, m, W - m);
    const ey = clamp(H / 2 + Math.sin(a) * H, m + 60, H - m);
    const color = g.type === 'earth' ? '120, 190, 255' : '0, 240, 255';
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = `rgba(${color}, 0.25)`;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${color}, 0.95)`;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (ship) {
        const d = Math.hypot(g.x - ship.position.x, g.y - ship.position.y);
        ctx.fillStyle = `rgba(${color}, 0.85)`;
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(d / 10)} km`, ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4);
    }
}

function drawMinimap(w) {
    const mw = minimap.width / DPR, mh = minimap.height / DPR;
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    mctx.clearRect(0, 0, mw, mh);
    const b = w.lvl.bounds;
    const pad = 8;
    const s = Math.min((mw - pad * 2) / (b.x1 - b.x0), (mh - pad * 2) / (b.y1 - b.y0));
    const ox = pad + ((mw - pad * 2) - (b.x1 - b.x0) * s) / 2;
    const oy = pad + ((mh - pad * 2) - (b.y1 - b.y0) * s) / 2;
    const X = (x) => ox + (x - b.x0) * s, Y = (y) => oy + (y - b.y0) * s;
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    mctx.strokeRect(ox, oy, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);
    for (const p of w.planets) {
        mctx.fillStyle = hexA((PALETTES[p.palette] || PALETTES.purple)[1], 0.9);
        mctx.beginPath();
        mctx.arc(X(p.x), Y(p.y), Math.max(2, p.r * s), 0, Math.PI * 2);
        mctx.fill();
    }
    if (w.sun) {
        mctx.fillStyle = '#ffb347';
        mctx.beginPath();
        mctx.arc(X(w.sun.x), Y(w.sun.y), Math.max(3, w.sun.r * s), 0, Math.PI * 2);
        mctx.fill();
    }
    if (w.boss) {
        mctx.fillStyle = 'rgba(255, 100, 130, 0.8)';
        mctx.beginPath();
        w.boss.body.vertices.forEach((v, i) => (i ? mctx.lineTo(X(v.x), Y(v.y)) : mctx.moveTo(X(v.x), Y(v.y))));
        mctx.fill();
    }
    mctx.fillStyle = 'rgba(180, 175, 210, 0.6)';
    for (const a of w.asteroids) mctx.fillRect(X(a.x) - 1, Y(a.y) - 1, 2, 2);
    mctx.fillStyle = '#ff5a6e';
    for (const d of w.drones) mctx.fillRect(X(d.x) - 1.5, Y(d.y) - 1.5, 3, 3);
    for (const r of w.rockets) mctx.fillRect(X(r.x) - 1, Y(r.y) - 1, 2, 2);
    for (const p of w.pickups) {
        if (p.taken) continue;
        mctx.fillStyle = p.kind === 'star' ? '#ffe08a' : '#ffaa00';
        mctx.beginPath();
        mctx.arc(X(p.x), Y(p.y), 2.2, 0, Math.PI * 2);
        mctx.fill();
    }
    mctx.strokeStyle = w.goal.type === 'earth' ? '#7fb8ff' : '#00f0ff';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.arc(X(w.goal.x), Y(w.goal.y), Math.max(3.5, w.goal.r * s), 0, Math.PI * 2);
    mctx.stroke();
    if (ship && !w.shipGone) {
        mctx.save();
        mctx.translate(X(ship.position.x), Y(ship.position.y));
        mctx.rotate(ship.angle);
        mctx.fillStyle = '#ffffff';
        mctx.beginPath();
        mctx.moveTo(0, -5);
        mctx.lineTo(3.5, 4);
        mctx.lineTo(-3.5, 4);
        mctx.closePath();
        mctx.fill();
        mctx.restore();
    }
}

function render(now) {
    const t = now / 1000;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const w = flight;
    if (!w) {
        // Menu and build: drifting stars with a planet in the corner
        menuTime += 1 / 60;
        drawBackground(menuTime * 14, menuTime * 4, t);
        const s = menuPlanet.worldSize;
        const scale = clamp(Math.min(W, H) / 700, 0.6, 1.2);
        ctx.save();
        ctx.translate(W - s * 0.22 * scale, H - s * 0.2 * scale);
        ctx.scale(scale, scale);
        ctx.globalAlpha = state === 'BUILD' ? 0.35 : 0.9;
        drawSprite(menuPlanet, 0, 0, Math.sin(t * 0.1) * 0.05);
        ctx.restore();
        ctx.globalAlpha = 1;
        return;
    }

    // Camera follows the ship, looking ahead and zooming out a little at speed
    if (ship && !w.shipGone) {
        const v = ship.velocity;
        const speed = Math.hypot(v.x, v.y);
        const tx = ship.position.x + v.x * 22, ty = ship.position.y + v.y * 22;
        cam.x = lerp(cam.x, tx, 0.06);
        cam.y = lerp(cam.y, ty, 0.06);
        const tz = baseZoom() * clamp(1.08 - speed / 28, 0.68, 1.08);
        cam.zoom = lerp(cam.zoom, tz, 0.03);
    }
    cam.shake *= 0.9;
    const shx = (Math.random() - 0.5) * cam.shake, shy = (Math.random() - 0.5) * cam.shake;

    drawBackground(cam.x, cam.y, t);
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    drawBounds(w);
    if (w.goal.type === 'earth') {
        const pulse = 1 + Math.sin(t * 1.5) * 0.03;
        ctx.save();
        ctx.translate(w.goal.x, w.goal.y);
        ctx.scale(pulse, pulse);
        drawSprite(w.goal.sprite, 0, 0, 0);
        ctx.restore();
    } else {
        drawWormhole(w.goal, t);
    }
    for (const p of w.planets) drawSprite(p.sprite, p.x, p.y, 0);
    if (w.pad) {
        const pd = w.pad.position;
        ctx.fillStyle = '#4b5672';
        roundRect(ctx, pd.x - 75, pd.y - 7, 150, 14, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
        for (let i = -3; i <= 3; i++) {
            ctx.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4 + i));
            ctx.fillRect(pd.x + i * 20 - 3, pd.y - 2, 6, 4);
        }
        ctx.globalAlpha = 1;
    }
    if (w.sun) drawSun(w.sun, t);
    if (w.boss) drawBoss(w.boss, t);
    for (const tt of w.turrets) drawTurret(tt);
    for (const a of w.asteroids) drawAsteroid(a);
    for (const p of w.pickups) drawPickup(p, t);
    for (const r of w.rockets) drawRocket(r);
    for (const d of w.drones) drawDrone(d);
    drawBolts(w);
    drawShip(w, t);
    drawParticles(w);
    ctx.restore();

    // Screen-space effects
    drawGoalArrow(w);
    if (flashRed > 0) {
        flashRed -= 1 / 60;
        const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        grad.addColorStop(0, 'rgba(255, 60, 90, 0)');
        grad.addColorStop(1, `rgba(255, 60, 90, ${flashRed * 0.6})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    if (w.outside > 0) {
        const a = clamp(w.outside / 650, 0.15, 0.6);
        const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
        grad.addColorStop(0, 'rgba(255, 60, 90, 0)');
        grad.addColorStop(1, `rgba(255, 60, 90, ${a})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    drawMinimap(w);
    updateHud();
}

// ------------------------------------------------------------------------------------------------
// Input
// ------------------------------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    Sound.unlock();
    if (state === 'MENU') {
        const n = Number(e.key);
        if (n >= 1 && n <= 5) openLevel(n - 1); // Shortcut: jump straight to a level
        return;
    }
    if (state === 'BUILD') {
        const n = Number(e.key);
        if (n >= 1 && n <= 5) selectPart(PART_ORDER[n - 1]);
        else if (e.key === '6') selectPart('eraser');
        else if (e.code === 'KeyR') {
            if (PARTS[selectedPart] && PARTS[selectedPart].dir) rotateSelected();
        } else if (e.code === 'KeyM') toggleMirror();
        else if (e.code === 'Enter') launch();
        else if (e.code === 'Escape') goMenu();
        return;
    }
    if (state === 'PAUSED') {
        if (e.code === 'Escape' || e.code === 'KeyP') resume();
        return;
    }
    if (state === 'RESULT') {
        if (e.code === 'KeyR' || e.code === 'Enter') {
            const first = $('message-buttons').querySelector('button');
            if (e.code === 'Enter' && first) first.click();
            else retryFlight();
        }
        return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
        pause();
        return;
    }
    if (e.code === 'KeyR' && (state === 'FLY' || state === 'DEAD')) {
        retryFlight();
        return;
    }
    if (KEY_DIR[e.code]) {
        input[KEY_DIR[e.code]] = true;
        e.preventDefault();
    }
    if (e.code === 'KeyQ') input.rotL = true;
    if (e.code === 'KeyE') input.rotR = true;
    if (e.code === 'Space') {
        input.fire = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (KEY_DIR[e.code]) input[KEY_DIR[e.code]] = false;
    if (e.code === 'KeyQ') input.rotL = false;
    if (e.code === 'KeyE') input.rotR = false;
    if (e.code === 'Space') input.fire = false;
});

window.addEventListener('blur', () => {
    for (const k of Object.keys(input)) input[k] = false;
});

// Touch buttons: hold to fire thrusters, turn or shoot
document.querySelectorAll('.touch-btn').forEach(btn => {
    const key = btn.dataset.dir || btn.dataset.act;
    const set = (on) => {
        input[key] = on;
        btn.classList.toggle('pressed', on);
    };
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        Sound.unlock();
        btn.setPointerCapture(e.pointerId);
        set(true);
    });
    btn.addEventListener('pointerup', () => set(false));
    btn.addEventListener('pointercancel', () => set(false));
    btn.addEventListener('lostpointercapture', () => set(false));
});

for (const id of ['btn-sound', 'btn-sound-menu']) {
    $(id).addEventListener('click', () => {
        const muted = Sound.toggle();
        updateSoundButtons(muted);
    });
}

function updateSoundButtons(muted) {
    for (const id of ['btn-sound', 'btn-sound-menu']) $(id).classList.toggle('muted', muted);
}

// ------------------------------------------------------------------------------------------------
// Main loop
// ------------------------------------------------------------------------------------------------
let lastTime = performance.now();
let acc = 0;

function loop(now) {
    const dt = Math.min(100, now - lastTime);
    lastTime = now;
    if (flight && (state === 'FLY' || state === 'WARP' || state === 'DEAD')) {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 5) {
            stepWorld();
            acc -= STEP;
            steps++;
        }
        if (steps === 5) acc = 0;
    } else {
        acc = 0;
        if (flight && flight.particles) updateParticles(flight);
    }
    render(now);
    requestAnimationFrame(loop);
}

resize();
renderMenu();
updateSoundButtons(Sound.isMuted());
requestAnimationFrame(loop);
