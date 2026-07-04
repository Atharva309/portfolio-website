const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add text to thruster button
const oldThruster = `<div class="part-name">Thruster</div>`;
const newThruster = `<div class="part-name">Thruster</div>
                    <div class="part-hint" style="font-size: 10px; color: #00f0ff; text-align: center; margin-top: 4px; font-weight: bold; text-shadow: 0 0 5px rgba(0,240,255,0.5);">CLICK TO<br>ROTATE</div>`;
html = html.replace(oldThruster, newThruster);

// 2. Add arrow key hint to launch button
const oldLaunchBtn = `<span id="play-text">LAUNCH</span>`;
const newLaunchBtn = `<span id="play-text">LAUNCH</span>
                <div class="mini-keys">
                    <span class="mini-key">↑</span>
                    <span class="mini-key">←</span>
                    <span class="mini-key">↓</span>
                    <span class="mini-key">→</span>
                </div>`;
html = html.replace(oldLaunchBtn, newLaunchBtn);

// 3. Add big arrow keys to the Intro overlay
const oldIntro = `<h2>Level <span id="intro-level">1</span></h2>
        <p>Reach the end planet! use arrow keys to control.</p>`;
const newIntro = `<h2>Level <span id="intro-level">1</span></h2>
        <p>Reach the end planet!</p>
        <div class="big-keys">
            <div class="key-row"><div class="key">↑</div></div>
            <div class="key-row"><div class="key">←</div><div class="key">↓</div><div class="key">→</div></div>
            <p class="key-label">USE ARROW KEYS</p>
        </div>`;
html = html.replace(oldIntro, newIntro);

fs.writeFileSync('index.html', html);


let css = fs.readFileSync('styles.css', 'utf8');
css += `

/* --- UI Hints --- */
.mini-keys {
    display: flex;
    gap: 2px;
    margin-left: 8px;
    align-items: center;
}
.mini-key {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 2px;
    font-size: 10px;
    width: 14px;
    height: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
}
.big-keys {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    margin-top: 20px;
}
.key-row {
    display: flex;
    gap: 5px;
}
.key {
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(0, 240, 255, 0.8);
    border-radius: 6px;
    font-size: 24px;
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #00f0ff;
    text-shadow: 0 0 10px #00f0ff;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.3), inset 0 0 10px rgba(0, 240, 255, 0.2);
    font-weight: bold;
}
.key-label {
    margin-top: 10px !important;
    font-size: 14px !important;
    color: #00f0ff !important;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: bold;
}
`;

fs.writeFileSync('styles.css', css);
console.log('UI QoL patched');
