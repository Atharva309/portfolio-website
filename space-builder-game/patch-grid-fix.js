const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldBuildMode = `function _internalStartBuildMode() {
    state = 'BUILD';
    btnPlay.innerText = 'LAUNCH';
    btnPlay.classList.add('btn-primary');
    document.querySelector('.inventory-left').style.opacity = '1';
    document.querySelector('.inventory-left').style.pointerEvents = 'auto';
    buildGridContainer.classList.remove('hidden');
    canvas.classList.add('hidden');
    levelIndicator.innerText = "Level " + (currentLevel + 1) + "/5";`;

const newBuildMode = `function _internalStartBuildMode() {
    state = 'BUILD';
    btnPlay.innerText = 'LAUNCH';
    btnPlay.classList.add('btn-primary');
    document.querySelector('.inventory-left').style.opacity = '1';
    document.querySelector('.inventory-left').style.pointerEvents = 'auto';
    buildGridContainer.classList.remove('hidden');
    canvas.classList.add('hidden');
    levelIndicator.innerText = "Level " + (currentLevel + 1) + "/5";
    initLayout(); // Fix for disappearing grid`;

code = code.replace(oldBuildMode, newBuildMode);
fs.writeFileSync('game.js', code);
console.log('Grid fix applied');
