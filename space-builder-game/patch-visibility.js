const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Fix afterRender visibility for STARTING state
code = code.replace(`        if (state === 'DRIVE' && carBody) {
            // Custom Rocket Rendering`, 
`        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
            // Custom Rocket Rendering`);

code = code.replace(`        if (state === 'DRIVE' && carBody) {
            // Custom Laser Rendering`,
`        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
            // Custom Laser Rendering`);

// Add hotkeys for testing
const hotkeys = `window.addEventListener('keydown', (e) => {
    // Debug hotkeys
    if (e.key === '4') { currentLevel = 3; startBuildMode(); return; }
    if (e.key === '5') { currentLevel = 4; startBuildMode(); return; }
    if (e.key === '1') { currentLevel = 0; startBuildMode(); return; }

    if (state === 'DRIVE') {`;
code = code.replace(`window.addEventListener('keydown', (e) => {
    if (state === 'DRIVE') {`, hotkeys);

fs.writeFileSync('game.js', code);
console.log('Visibility and hotkeys patched');
