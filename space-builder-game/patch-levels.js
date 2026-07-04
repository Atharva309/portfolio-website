const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const levelsCode = `const levels = [
    {
        // Level 1: Simple Gravity Assist (No Defenses)
        startPos: { x: 500, y: 500 },
        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db' }
        ],
        defenses: [],
        goal: { x: 2500, y: 500, radius: 80 }
    },
    {
        // Level 2: Slingshot between two with 1 rocket launcher
        startPos: { x: 300, y: 300 },
        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c' },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 3000 } // Shoots every 3s from planet 0
        ],
        goal: { x: 2500, y: 200, radius: 80 }
    },
    {
        // Level 3: Planet wall with multiple rocket launchers
        startPos: { x: 300, y: 500 },
        planets: [
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f' },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 2500 },
            { type: 'rocket', planetIdx: 1, interval: 2500, offsetMs: 1250 }
        ],
        goal: { x: 2200, y: 500, radius: 80 }
    },
    {
        // Level 4: The massive sun + lasers and rockets
        startPos: { x: 300, y: 800 },
        planets: [
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c' },
            { x: 2300, y: 800, radius: 100, mass: 1.0, color: '#95a5a6' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 2000 },
            { type: 'laser', x: 2000, y: 100, width: 20, height: 800, onMs: 2000, offMs: 2000 }
        ],
        goal: { x: 2700, y: 200, radius: 80 }
    },
    {
        // Level 5: Boss Ship
        startPos: { x: 200, y: 500 },
        planets: [
            // The Boss Ship is essentially made of static planets/shapes
            { x: 1500, y: 500, radius: 200, mass: 2.0, color: '#2c3e50' }, // Main hull
            { x: 1500, y: 250, radius: 80, mass: 0.5, color: '#34495e' }, // Top turret
            { x: 1500, y: 750, radius: 80, mass: 0.5, color: '#34495e' }, // Bottom turret
        ],
        defenses: [
            { type: 'laser', x: 1500, y: -50, width: 20, height: 300, onMs: 3000, offMs: 1000 },
            { type: 'laser', x: 1500, y: 1050, width: 20, height: 300, onMs: 3000, offMs: 1000 },
            { type: 'rocket', planetIdx: 1, interval: 1500 },
            { type: 'rocket', planetIdx: 2, interval: 1500, offsetMs: 750 },
            { type: 'rocket', planetIdx: 0, interval: 3000 }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    }
];`;

const startIdx = code.indexOf('const levels = [');
const endIdx = code.indexOf('];\nlet state') + 2;
code = code.substring(0, startIdx) + levelsCode + code.substring(endIdx);

fs.writeFileSync('game.js', code);
console.log('Levels updated.');
