const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Give the player more time by delaying Level 5 Boss Lasers
code = code.replace(`            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 1000 },`,
`            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },`);

// 2. Init drones to have rocket timers instead of laser bodies
const oldDroneInit = `            if (def.type === 'drone') {
                const drone = Bodies.polygon(def.x, def.y, 3, 30, {
                    frictionAir: 0.08,
                    render: { fillStyle: '#8e44ad' },
                    label: 'rocket' // use rocket label for explosions
                });
                
                const laserBody = Bodies.rectangle(def.x, def.y, 5000, 20, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(255, 0, 0, 0)' },
                    label: 'laser' // use laser label for explosions
                });
                laserBody.timer = 2000;
                laserBody.isOn = false;
                
                drone.laserBody = laserBody;
                drones.push(drone);
                
                bodiesToRender.push(drone, laserBody);
            }`;
const newDroneInit = `            if (def.type === 'drone') {
                const drone = Bodies.polygon(def.x, def.y, 3, 30, {
                    frictionAir: 0.08,
                    render: { fillStyle: '#8e44ad' },
                    label: 'rocket' 
                });
                drone.rocketTimer = 5000; // 5 seconds initial delay before firing
                drones.push(drone);
                bodiesToRender.push(drone);
            }`;
code = code.replace(oldDroneInit, newDroneInit);

// 3. Drone Update logic: remove laser tracking, add rocket firing
const oldDroneUpdate = `                    // Keep laser attached to drone nose
                    const distToCenter = 30 + 2500; 
                    const cx = drone.position.x + Math.cos(drone.angle) * distToCenter;
                    const cy = drone.position.y + Math.sin(drone.angle) * distToCenter;
                    
                    Body.setPosition(drone.laserBody, { x: cx, y: cy });
                    Body.setAngle(drone.laserBody, drone.angle);
                    
                    // Pulse Timer
                    drone.laserBody.timer -= 16.66;
                    if (drone.laserBody.isOn) {
                        if (drone.laserBody.timer <= 0) {
                            drone.laserBody.isOn = false;
                            drone.laserBody.timer = 3000;
                        }
                    } else {
                        if (drone.laserBody.timer <= 0) {
                            drone.laserBody.isOn = true;
                            drone.laserBody.timer = 2000;
                        }
                    }`;
const newDroneUpdate = `                    // Rocket firing
                    if (state === 'DRIVE') {
                        drone.rocketTimer -= 16.66;
                        if (drone.rocketTimer <= 0) {
                            drone.rocketTimer = 4000; // fire every 4s
                            
                            // Spawn rocket at drone nose
                            const noseX = drone.position.x + Math.cos(drone.angle) * 40;
                            const noseY = drone.position.y + Math.sin(drone.angle) * 40;
                            
                            const rocket = Bodies.rectangle(noseX, noseY, 30, 12, {
                                render: { fillStyle: 'rgba(0,0,0,0)' },
                                frictionAir: 0.05,
                                angle: drone.angle,
                                label: 'rocket'
                            });
                            rocket.age = 0;
                            rockets.push(rocket);
                            Composite.add(engine.world, rocket);
                        }
                    }`;
code = code.replace(oldDroneUpdate, newDroneUpdate);

// 4. Remove drone laser rendering
const oldDroneRender = `            // Custom Drone Laser Rendering
            for (let drone of drones) {
                if (!drone.laserBody.isOn) continue;
                const laser = drone.laserBody;
                
                ctx.save();
                if (render.bounds) {
                    const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                    const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
                }
                ctx.translate(laser.position.x, laser.position.y);
                ctx.rotate(laser.angle);
                
                ctx.fillStyle = \`rgba(150, 0, 255, \${0.3 + Math.random()*0.2})\`;
                ctx.fillRect(-2500, -20, 5000, 40);
                ctx.fillStyle = \`rgba(200, 100, 255, 0.8)\`;
                ctx.fillRect(-2500, -10, 5000, 20);
                ctx.fillStyle = \`rgba(255, 255, 255, 1)\`;
                ctx.fillRect(-2500, -4, 5000, 8);
                
                ctx.restore();
            }`;
code = code.replace(oldDroneRender, ``);

fs.writeFileSync('game.js', code);
console.log('Drones converted to rocket launchers');
