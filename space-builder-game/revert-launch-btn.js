const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldBtn = `<button id="btn-play" class="btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        LAUNCH
                        <div class="mini-keys" style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <div style="display:flex;"><span class="mini-key">↑</span></div>
                            <div style="display:flex; gap:2px;"><span class="mini-key">←</span><span class="mini-key">↓</span><span class="mini-key">→</span></div>
                        </div>
                      </button>`;
const newBtn = `<button id="btn-play" class="btn-primary">LAUNCH</button>`;
html = html.replace(oldBtn, newBtn);

fs.writeFileSync('index.html', html);
console.log('Launch button reverted');
