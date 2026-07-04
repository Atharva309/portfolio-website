const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. One line for CLICK TO ROTATE
html = html.replace('CLICK TO<br>ROTATE', 'CLICK TO ROTATE');
html = html.replace('font-size: 10px;', 'font-size: 8.5px; white-space: nowrap;'); // Make it slightly smaller to fit

// 2. Fix mini-keys layout to be an inverted T shape
const oldMiniKeys = `<div class="mini-keys" style="display:flex; gap:2px;">
                            <span class="mini-key">↑</span>
                            <span class="mini-key">←</span>
                            <span class="mini-key">↓</span>
                            <span class="mini-key">→</span>
                        </div>`;
const newMiniKeys = `<div class="mini-keys" style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <div style="display:flex;"><span class="mini-key">↑</span></div>
                            <div style="display:flex; gap:2px;"><span class="mini-key">←</span><span class="mini-key">↓</span><span class="mini-key">→</span></div>
                        </div>`;
html = html.replace(oldMiniKeys, newMiniKeys);

fs.writeFileSync('index.html', html);
console.log('UI Tweaks applied');
