const fs = require('fs');

// 1. Update CSS
let css = fs.readFileSync('styles.css', 'utf8');
const oldCssH2 = `#message-overlay h2, #intro-overlay h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    background: linear-gradient(90deg, #ff3366, #ff8833);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
#intro-overlay h2 {
    background: linear-gradient(90deg, #00f0ff, #ff00ea);
    -webkit-background-clip: text;
}`;
const newCssH2 = `#message-overlay h2, #intro-overlay h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    background: linear-gradient(90deg, #00f0ff, #0077ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
#intro-overlay h2 {
    background: linear-gradient(90deg, #00f0ff, #0055ff);
    -webkit-background-clip: text;
}`;
css = css.replace(oldCssH2, newCssH2);
fs.writeFileSync('styles.css', css);

// 2. Update Game.js
let game = fs.readFileSync('game.js', 'utf8');

// 2a. Update Earth glow
const oldEarth = `            // Atmosphere glow behind emoji
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
            ctx.fill();`;
const newEarth = `            // Atmosphere glow behind emoji
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(100, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 255, 255, 0.6)';
            ctx.fill();
            ctx.restore();`;
game = game.replace(oldEarth, newEarth);

// 2b. Update overlay text logic
const oldIntro = `    introOverlay.classList.remove('hidden');`;
const newIntro = `    const introText = introOverlay.querySelector('h2');
    if (introText) {
        if (currentLevel === 4) {
            introText.innerText = "REACH EARTH";
        } else {
            introText.innerText = "REACH THE WORMHOLE";
        }
    }
    introOverlay.classList.remove('hidden');`;
game = game.replace(oldIntro, newIntro); // Only replaces the first one (which is in startDriveMode)

fs.writeFileSync('game.js', game);
console.log('Polish applied!');
