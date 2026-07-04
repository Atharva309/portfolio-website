const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Level 1 fix
code = code.replace(
`        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db' }
        ],`,
`        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db', style: 'cratered', seed: 1 }
        ],`
);

// Level 2 fix
code = code.replace(
`        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c' },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6' }
        ],`,
`        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c', style: 'gas-giant', seed: 2 },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6', style: 'cratered', seed: 3 }
        ],`
);

// Level 3 fix
code = code.replace(
`        planets: [
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f' },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22' }
        ],`,
`        planets: [
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f', style: 'ringed', seed: 4 },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22', style: 'gas-giant', seed: 5 }
        ],`
);

fs.writeFileSync('game.js', code);
console.log('Levels 1-3 patched properly');
