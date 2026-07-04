const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldDefenses = `        defenses: [
            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'drone', x: 2000, y: 200 },
            { type: 'drone', x: 2000, y: 800 }
        ],`;
const newDefenses = `        defenses: [
            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'drone', x: 1200, y: 250 },
            { type: 'drone', x: 1200, y: 750 },
            { type: 'drone', x: 2000, y: 200 },
            { type: 'drone', x: 2000, y: 800 }
        ],`;

code = code.replace(oldDefenses, newDefenses);
fs.writeFileSync('game.js', code);
console.log('Added 2 more drones');
