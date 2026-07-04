const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add text to thruster button
const oldThruster = `<span id="thruster-label">Thruster (Up)</span>`;
const newThruster = `<span id="thruster-label">Thruster (Up)</span>
                    <div class="part-hint" style="font-size: 10px; color: #00f0ff; text-align: center; margin-top: 4px; font-weight: bold; text-shadow: 0 0 5px rgba(0,240,255,0.5); line-height: 1;">CLICK TO<br>ROTATE</div>`;
html = html.replace(oldThruster, newThruster);

// 2. Add arrow key hint to launch button
const oldLaunchBtn = `<button id="btn-play" class="btn-primary">LAUNCH</button>`;
const newLaunchBtn = `<button id="btn-play" class="btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        LAUNCH
                        <div class="mini-keys" style="display:flex; gap:2px;">
                            <span class="mini-key">↑</span>
                            <span class="mini-key">←</span>
                            <span class="mini-key">↓</span>
                            <span class="mini-key">→</span>
                        </div>
                      </button>`;
html = html.replace(oldLaunchBtn, newLaunchBtn);

// 3. Add big arrow keys to the Intro overlay
const oldIntro = `<div id="intro-overlay" class="hidden">
            <h2>Reach the end planet!</h2>
            <p>Use arrow keys to control thrust</p>
        </div>`;
const newIntro = `<div id="intro-overlay" class="hidden">
            <h2>Reach the end planet!</h2>
            <div class="big-keys">
                <div class="key-row"><div class="key">↑</div></div>
                <div class="key-row"><div class="key">←</div><div class="key">↓</div><div class="key">→</div></div>
                <p class="key-label">USE ARROW KEYS</p>
            </div>
        </div>`;
html = html.replace(oldIntro, newIntro);

fs.writeFileSync('index.html', html);
console.log('UI QoL patched in HTML');
