const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldBoss = `            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 220, angle: Math.PI, mass: 1.5, color: '#2c3e50' },`;
const newBoss = `            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 220, angle: 0, mass: 1.5, color: '#2c3e50' },`;

code = code.replace(oldBoss, newBoss);
fs.writeFileSync('game.js', code);
console.log('Boss big triangle mirrored');
