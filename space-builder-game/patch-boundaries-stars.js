const fs = require('fs');

let game = fs.readFileSync('game.js', 'utf8');

// Update Boundaries
const oldBoundaries = `const thick = 200;
    const bOpts = { isStatic: true, render: { fillStyle: '#ff0055' }, label: 'boundary', friction: 0.1, restitution: 0.8 };`;
const newBoundaries = `const thick = 50;
    const bOpts = { isStatic: true, render: { fillStyle: '#5a0a1a' }, label: 'boundary', friction: 0.1, restitution: 0.8 };`;
game = game.replace(oldBoundaries, newBoundaries);

// Update Stars
const oldStars = `for(let i=0; i<5000; i++) {
    stars.push({
        x: (Math.random() - 0.5) * 30000,
        y: (Math.random() - 0.5) * 20000,`;
const newStars = `for(let i=0; i<3000; i++) {
    stars.push({
        x: (Math.random() * 8000) - 2000,
        y: (Math.random() * 6000) - 2000,`;
game = game.replace(oldStars, newStars);

fs.writeFileSync('game.js', game);
console.log("Boundaries and stars patched.");
