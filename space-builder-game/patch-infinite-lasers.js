const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Update Level 4
code = code.replace(`            { type: 'rocket', planetIdx: 0, interval: 2000 },
            { type: 'laser', x: 2000, y: 100, width: 20, height: 800, onMs: 2000, offMs: 2000 }`,
`            { type: 'rocket', planetIdx: 0, interval: 2000 },
            { type: 'laser', planetIdx: 0, angle: -Math.PI/2, width: 20, onMs: 2000, offMs: 2000 }`);

// Update Level 5
code = code.replace(`            { type: 'laser', x: 1500, y: -50, width: 20, height: 300, onMs: 3000, offMs: 1000 },
            { type: 'laser', x: 1500, y: 1050, width: 20, height: 300, onMs: 3000, offMs: 1000 },`,
`            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },`);

// Update laser physics initialization
const oldLaserInit = `            if (def.type === 'laser') {
                const laserBody = Bodies.rectangle(def.x, def.y, def.width, def.height, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(255, 0, 0, 0)' },
                    label: 'laser'
                });
                laserBody.def = def;
                laserBody.timer = def.offMs || 0;
                laserBody.isOn = false;
                lasers.push(laserBody);
                bodiesToRender.push(laserBody);
                
                // Add physical laser emitter structures
                const emitterTop = Bodies.rectangle(def.x, def.y - def.height/2, 40, 20, {
                    isStatic: true,
                    render: { fillStyle: '#c0392b' },
                    label: 'emitter'
                });
                const emitterBottom = Bodies.rectangle(def.x, def.y + def.height/2, 40, 20, {
                    isStatic: true,
                    render: { fillStyle: '#c0392b' },
                    label: 'emitter'
                });
                bodiesToRender.push(emitterTop, emitterBottom);
            }`;

const newLaserInit = `            if (def.type === 'laser') {
                const p = levelPlanets[def.planetIdx];
                if (p) {
                    const length = 5000; // "Infinitely" long
                    const angle = def.angle;
                    
                    const distToCenter = p.circleRadius + length/2;
                    const cx = p.position.x + Math.cos(angle) * distToCenter;
                    const cy = p.position.y + Math.sin(angle) * distToCenter;
                    
                    const laserBody = Bodies.rectangle(cx, cy, length, def.width, {
                        isStatic: true,
                        isSensor: true,
                        angle: angle,
                        render: { fillStyle: 'rgba(255, 0, 0, 0)' },
                        label: 'laser'
                    });
                    laserBody.def = def;
                    laserBody.timer = def.offMs || 0;
                    laserBody.isOn = false;
                    laserBody.pOrigin = p.position; // Store planet origin for rendering
                    laserBody.pRadius = p.circleRadius;
                    lasers.push(laserBody);
                    bodiesToRender.push(laserBody);
                    
                    // Add physical laser emitter structure on the planet surface
                    const ex = p.position.x + Math.cos(angle) * (p.circleRadius + 10);
                    const ey = p.position.y + Math.sin(angle) * (p.circleRadius + 10);
                    const emitter = Bodies.rectangle(ex, ey, 40, 20, {
                        isStatic: true,
                        angle: angle + Math.PI/2,
                        render: { fillStyle: '#c0392b' },
                        label: 'emitter'
                    });
                    bodiesToRender.push(emitter);
                }
            }`;
code = code.replace(oldLaserInit, newLaserInit);

fs.writeFileSync('game.js', code);
console.log('Infinite Lasers patched successfully');
