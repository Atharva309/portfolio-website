const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldBoss = `        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1500, y: 500, radius: 250, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1650, y: 300, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1650, y: 700, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            // Details
            { x: 1400, y: 500, radius: 45, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],`;
const newBoss = `        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 220, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1620, y: 330, radius: 130, angle: -Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1620, y: 670, radius: 130, angle: -Math.PI/2, mass: 0.3, color: '#34495e' },
            // Details
            { x: 1450, y: 500, radius: 35, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],`;

code = code.replace(oldBoss, newBoss);
fs.writeFileSync('game.js', code);
console.log('Boss patched');
