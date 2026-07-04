const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Increase star count
const oldStars = `for(let i=0; i<2500; i++) {`;
const newStars = `for(let i=0; i<5000; i++) {`;
code = code.replace(oldStars, newStars);

// Modify shimmer logic for true on/off dimming
const oldAlpha = `const alpha = 0.1 + (Math.sin(star.phase + starTime * star.speed) + 1) * 0.45;`;
const newAlpha = `const rawAlpha = Math.sin(star.phase + starTime * star.speed);
            const alpha = Math.max(0, rawAlpha * 1.5 - 0.5);`;
code = code.replace(oldAlpha, newAlpha);

fs.writeFileSync('game.js', code);
console.log('Stars updated');
