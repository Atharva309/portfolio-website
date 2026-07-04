const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldDetails = `            // Details (Cockpit & Thruster)
            { x: 1400, y: 500, radius: 45, mass: 0.1, color: '#c0392b' }, // Scary Red Cockpit Eye
            { x: 1680, y: 500, radius: 80, mass: 0.1, color: '#00f0ff' }, // Cyan Thruster Glow
            { x: 1690, y: 500, radius: 50, mass: 0.1, color: '#ffffff' }  // Thruster core
        ],`;
const newDetails = `            // Details
            { x: 1400, y: 500, radius: 45, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],`;

code = code.replace(oldDetails, newDetails);
fs.writeFileSync('game.js', code);
console.log('Blue/White thrusters removed from Boss');
