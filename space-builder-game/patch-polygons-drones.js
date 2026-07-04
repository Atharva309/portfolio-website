const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Global drones array
code = code.replace(`let rockets = [];`, `let rockets = [];\nlet drones = [];`);

// Clear drones in initPhysics
code = code.replace(`    lasers = [];`, `    lasers = [];\n    drones = [];`);

// Update level 5
const oldLvl5 = `    {
        // Level 5: Boss Ship
        startPos: { x: 200, y: 500 },
        planets: [
            // Millennium Falcon style boss ship
            { x: 1500, y: 500, radius: 200, mass: 1.5, color: '#34495e' }, // 0: Main Saucer
            { x: 1500, y: 280, radius: 70, mass: 0.3, color: '#2c3e50' }, // 1: Top Turret
            { x: 1500, y: 720, radius: 70, mass: 0.3, color: '#2c3e50' }, // 2: Bottom Turret
            { x: 1250, y: 380, radius: 80, mass: 0.4, color: '#34495e' }, // 3: Front Mandible Top
            { x: 1250, y: 620, radius: 80, mass: 0.4, color: '#34495e' }, // 4: Front Mandible Bottom
            { x: 1620, y: 350, radius: 60, mass: 0.2, color: '#1a252f' }, // 5: Side Cockpit Base
            { x: 1650, y: 330, radius: 30, mass: 0.0, color: '#c0392b' }, // 6: Scary Red Cockpit Window
            { x: 1650, y: 500, radius: 90, mass: 0.0, color: '#00f0ff' }  // 7: Back Engine Thruster Glow
        ],
        defenses: [
            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'rocket', planetIdx: 1, interval: 1500 },
            { type: 'rocket', planetIdx: 2, interval: 1500, offsetMs: 750 },
            { type: 'rocket', planetIdx: 0, interval: 3000 }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    }`;

const newLvl5 = `    {
        // Level 5: Pointy Boss Ship + Drones
        startPos: { x: 200, y: 500 },
        planets: [
            { shape: 'polygon', sides: 3, x: 1500, y: 500, radius: 250, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1650, y: 300, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1650, y: 700, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' }
        ],
        defenses: [
            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'drone', x: 2000, y: 200 },
            { type: 'drone', x: 2000, y: 800 }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    }`;
code = code.replace(oldLvl5, newLvl5);

// Update planets initialization
const oldPlanetInit = `    for (let p of level.planets) {
        const planetBody = Bodies.circle(p.x, p.y, p.radius, {
            isStatic: true,
            render: {
                fillStyle: p.color
            },
            label: 'planet'
        });
        planetBody.gravityMass = p.mass;
        levelPlanets.push(planetBody);
    }`;
const newPlanetInit = `    for (let p of level.planets) {
        let planetBody;
        if (p.shape === 'polygon') {
            planetBody = Bodies.polygon(p.x, p.y, p.sides || 3, p.radius, {
                isStatic: true,
                angle: p.angle || 0,
                render: { fillStyle: p.color },
                label: 'planet'
            });
        } else {
            planetBody = Bodies.circle(p.x, p.y, p.radius, {
                isStatic: true,
                render: { fillStyle: p.color },
                label: 'planet'
            });
        }
        planetBody.gravityMass = p.mass;
        levelPlanets.push(planetBody);
    }`;
code = code.replace(oldPlanetInit, newPlanetInit);

fs.writeFileSync('game.js', code);
console.log('Lvl5 structures updated');
