const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Boss Ship Visuals (Cockpit & Thruster)
const oldLvl5Planets = `        planets: [
            { shape: 'polygon', sides: 3, x: 1500, y: 500, radius: 250, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1650, y: 300, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1650, y: 700, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' }
        ],`;
const newLvl5Planets = `        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1500, y: 500, radius: 250, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1650, y: 300, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1650, y: 700, radius: 100, angle: Math.PI/2, mass: 0.3, color: '#34495e' },
            // Details (Cockpit & Thruster)
            { x: 1400, y: 500, radius: 45, mass: 0.1, color: '#c0392b' }, // Scary Red Cockpit Eye
            { x: 1680, y: 500, radius: 80, mass: 0.1, color: '#00f0ff' }, // Cyan Thruster Glow
            { x: 1690, y: 500, radius: 50, mass: 0.1, color: '#ffffff' }  // Thruster core
        ],`;
code = code.replace(oldLvl5Planets, newLvl5Planets);

// 2. Drone transparent render
const oldDrone = `                    frictionAir: 0.08,
                    render: { fillStyle: '#8e44ad' },
                    label: 'rocket' 
                });`;
const newDrone = `                    frictionAir: 0.08,
                    render: { fillStyle: 'rgba(0,0,0,0)' }, // Transparent for custom render
                    label: 'rocket' 
                });`;
code = code.replace(oldDrone, newDrone);

// 3. Drone custom drawing in afterRender
const droneDrawMarker = `        // Explosions`;
const newDroneDraw = `        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
            // Custom Drone Rendering
            for (let drone of drones) {
                ctx.save();
                if (render.bounds) {
                    const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                    const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
                }
                ctx.translate(drone.position.x, drone.position.y);
                ctx.rotate(drone.angle);
                
                // Body (Purple Triangle)
                ctx.fillStyle = '#8e44ad';
                ctx.beginPath();
                ctx.moveTo(30, 0);   
                ctx.lineTo(-15, 20); 
                ctx.lineTo(-15, -20); 
                ctx.fill();
                
                // Cockpit (Red window)
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.arc(5, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Thruster (Cyan exhaust)
                ctx.fillStyle = \`rgba(0, 240, 255, \${0.5 + Math.random()*0.5})\`;
                ctx.beginPath();
                ctx.moveTo(-15, -12);
                ctx.lineTo(-15 - Math.random()*25, 0);
                ctx.lineTo(-15, 12);
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        // Explosions`;
code = code.replace(droneDrawMarker, newDroneDraw);

fs.writeFileSync('game.js', code);
console.log('Boss and drones visual overhaul applied');
