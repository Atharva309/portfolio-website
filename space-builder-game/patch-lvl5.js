const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Update Level 4 rocket
const oldLvl4 = `        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 2000 },
            { type: 'laser', planetIdx: 0, angle: -Math.PI/2, width: 20, onMs: 2000, offMs: 2000 }
        ],`;
const newLvl4 = `        defenses: [
            { type: 'rocket', planetIdx: 1, interval: 2000 },
            { type: 'laser', planetIdx: 0, angle: -Math.PI/2, width: 20, onMs: 2000, offMs: 2000 }
        ],`;
code = code.replace(oldLvl4, newLvl4);

// Update Level 5 planets
const oldLvl5Planets = `        planets: [
            // The Boss Ship is essentially made of static planets/shapes
            { x: 1500, y: 500, radius: 200, mass: 2.0, color: '#2c3e50' }, // Main hull
            { x: 1500, y: 250, radius: 80, mass: 0.5, color: '#34495e' }, // Top turret
            { x: 1500, y: 750, radius: 80, mass: 0.5, color: '#34495e' }, // Bottom turret
        ],`;
const newLvl5Planets = `        planets: [
            // Millennium Falcon style boss ship
            { x: 1500, y: 500, radius: 200, mass: 1.5, color: '#34495e' }, // 0: Main Saucer
            { x: 1500, y: 280, radius: 70, mass: 0.3, color: '#2c3e50' }, // 1: Top Turret
            { x: 1500, y: 720, radius: 70, mass: 0.3, color: '#2c3e50' }, // 2: Bottom Turret
            { x: 1250, y: 380, radius: 80, mass: 0.4, color: '#34495e' }, // 3: Front Mandible Top
            { x: 1250, y: 620, radius: 80, mass: 0.4, color: '#34495e' }, // 4: Front Mandible Bottom
            { x: 1620, y: 350, radius: 60, mass: 0.2, color: '#1a252f' }, // 5: Side Cockpit Base
            { x: 1650, y: 330, radius: 30, mass: 0.0, color: '#c0392b' }, // 6: Scary Red Cockpit Window
            { x: 1650, y: 500, radius: 90, mass: 0.0, color: '#00f0ff' }  // 7: Back Engine Thruster Glow
        ],`;
code = code.replace(oldLvl5Planets, newLvl5Planets);

fs.writeFileSync('game.js', code);
console.log('Lvl4 and Lvl5 patched');
