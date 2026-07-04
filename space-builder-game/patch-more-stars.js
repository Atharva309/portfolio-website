const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldStars = `for(let i=0; i<400; i++) {
    stars.push({
        x: (Math.random() - 0.5) * 10000,
        y: (Math.random() - 0.5) * 10000,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
    });
}`;
const newStars = `for(let i=0; i<2500; i++) {
    stars.push({
        x: (Math.random() - 0.5) * 30000,
        y: (Math.random() - 0.5) * 20000,
        size: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.08
    });
}`;
code = code.replace(oldStars, newStars);

const oldAlpha = `const alpha = 0.3 + (Math.sin(star.phase + starTime * star.speed) + 1) * 0.35;`;
const newAlpha = `const alpha = 0.1 + (Math.sin(star.phase + starTime * star.speed) + 1) * 0.45;`;
code = code.replace(oldAlpha, newAlpha);

fs.writeFileSync('game.js', code);
console.log('More stars added');
