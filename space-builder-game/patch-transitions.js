const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
const oldHtml = `<main id="workspace">`;
const newHtml = `<div id="transition-overlay" class="hidden"></div>
    <main id="workspace">`;
html = html.replace(oldHtml, newHtml);
fs.writeFileSync('index.html', html);

// 2. Update styles.css
let css = fs.readFileSync('styles.css', 'utf8');
css += `
/* Cinematic Fade Transition */
#transition-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #050b14;
    z-index: 9999;
    opacity: 1;
    pointer-events: all;
    transition: opacity 0.5s ease-in-out;
}
#transition-overlay.hidden {
    opacity: 0;
    pointer-events: none;
    display: block !important;
}

/* Also give overlays a slight fade if we want */
#intro-overlay, #message-overlay {
    transition: opacity 0.3s ease;
}
#intro-overlay.hidden, #message-overlay.hidden {
    opacity: 0;
    pointer-events: none;
    display: flex !important;
}
`;
fs.writeFileSync('styles.css', css);

// 3. Update game.js
let game = fs.readFileSync('game.js', 'utf8');

// Inject fadeTransition function at the top
const gameSplit = game.split('let state = \'BUILD\';');
const fadeFunc = `function fadeTransition(callback) {
    const overlay = document.getElementById('transition-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        callback();
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 50);
    }, 500);
}

let state = 'BUILD';`;
game = gameSplit[0] + fadeFunc + gameSplit[1];

// Wrap startBuildMode logic
const oldStartBuild = `function startBuildMode() {
    state = 'BUILD';`;
const newStartBuild = `function _internalStartBuildMode() {
    state = 'BUILD';`;
game = game.replace(oldStartBuild, newStartBuild);

// Wait, startBuildMode also clears engines, etc. I need to rename startBuildMode to _internalStartBuildMode and create a wrapper.
const startBuildWrapper = `function startBuildMode() {
    fadeTransition(() => {
        _internalStartBuildMode();
    });
}
function _internalStartBuildMode`;
game = game.replace(`function _internalStartBuildMode`, startBuildWrapper);

// Wrap startDriveMode logic
const oldStartDrive = `function startDriveMode() {
    state = 'STARTING';`;
const newStartDrive = `function _internalStartDriveMode() {
    state = 'STARTING';`;
game = game.replace(oldStartDrive, newStartDrive);

const startDriveWrapper = `function startDriveMode() {
    fadeTransition(() => {
        _internalStartDriveMode();
    });
}
function _internalStartDriveMode`;
game = game.replace(`function _internalStartDriveMode`, startDriveWrapper);


fs.writeFileSync('game.js', game);
console.log('Transitions patched');
