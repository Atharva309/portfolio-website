const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Update collision Start
const oldCollision = `            if (bodyA === goalSensor || bodyB === goalSensor) {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') endGame("Level " + (currentLevel + 1) + " Complete!", "linear-gradient(90deg, #00f0ff, #ff00ea)", true);
                }
            }`;
const newCollision = `            if (bodyA === goalSensor || bodyB === goalSensor) {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') {
                        if (currentLevel === levels.length - 1) {
                            endGame("GALAXY SAVED!", "linear-gradient(90deg, #ffd700, #ff8c00)", true);
                        } else {
                            endGame("Level " + (currentLevel + 1) + " Complete!", "linear-gradient(90deg, #00f0ff, #ff00ea)", true);
                        }
                    }
                }
            }`;
code = code.replace(oldCollision, newCollision);

// Update btnResetLevel listener
const oldReset = `btnResetLevel.addEventListener('click', () => {
    uiOverlay.classList.add('hidden');
    if (state === 'WON') {
        currentLevel = Math.min(currentLevel + 1, levels.length - 1);
    }
    startBuildMode();
});`;
const newReset = `btnResetLevel.addEventListener('click', () => {
    uiOverlay.classList.add('hidden');
    if (state === 'WON') {
        if (currentLevel === levels.length - 1) {
            currentLevel = 0;
        } else {
            currentLevel = Math.min(currentLevel + 1, levels.length - 1);
        }
    }
    startBuildMode();
});`;
code = code.replace(oldReset, newReset);

// Update endGame function
const oldEndGame = `function endGame(msg, gradient, isWin) {
    state = isWin ? 'WON' : 'LOST';
    uiOverlay.classList.remove('hidden');
    msgText.innerText = msg;
    msgText.style.background = gradient;
    msgText.style.webkitBackgroundClip = "text";
    btnResetLevel.innerText = isWin ? "Next Level" : "Try Again";
}`;
const newEndGame = `function endGame(msg, gradient, isWin) {
    state = isWin ? 'WON' : 'LOST';
    uiOverlay.classList.remove('hidden');
    msgText.innerText = msg;
    msgText.style.background = gradient;
    msgText.style.webkitBackgroundClip = "text";
    
    if (isWin && currentLevel === levels.length - 1) {
        btnResetLevel.innerText = "Play Again";
        if (window.confetti) {
            let duration = 3000;
            let end = Date.now() + duration;
            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#00f0ff', '#ff00ea', '#ffd700']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#00f0ff', '#ff00ea', '#ffd700']
                });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    } else {
        btnResetLevel.innerText = isWin ? "Next Level" : "Try Again";
    }
}`;
code = code.replace(oldEndGame, newEndGame);

fs.writeFileSync('game.js', code);
console.log('Reward patched successfully');
