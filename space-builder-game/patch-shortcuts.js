const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldKeys = `    if (e.key === '4') { currentLevel = 3; startBuildMode(); return; }
    if (e.key === '5') { currentLevel = 4; startBuildMode(); return; }
    if (e.key === '1') { currentLevel = 0; startBuildMode(); return; }`;
const newKeys = `    if (e.key === '1') { currentLevel = 0; startBuildMode(); return; }
    if (e.key === '2') { currentLevel = 1; startBuildMode(); return; }
    if (e.key === '3') { currentLevel = 2; startBuildMode(); return; }
    if (e.key === '4') { currentLevel = 3; startBuildMode(); return; }
    if (e.key === '5') { currentLevel = 4; startBuildMode(); return; }`;

code = code.replace(oldKeys, newKeys);
fs.writeFileSync('game.js', code);
console.log('Shortcuts patched');
