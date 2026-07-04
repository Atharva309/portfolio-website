const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Remove sun spots (craters on sun)
const oldSunSpots = `            } else if (p.style === 'sun') {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                for(let i=0; i<4; i++) {
                    const cx = x + (rand(s++) - 0.5) * r * 1.2;
                    const cy = y + (rand(s++) - 0.5) * r * 1.2;
                    const cr = r * (0.15 + rand(s++) * 0.3);
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }`;
code = code.replace(oldSunSpots, '');


// 2. Fix Level 5 Boss Ship Angle (It was pointing UP instead of LEFT)
const oldBoss = `        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 220, angle: -Math.PI/2, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1620, y: 330, radius: 130, angle: -Math.PI/2, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1620, y: 670, radius: 130, angle: -Math.PI/2, mass: 0.3, color: '#34495e' },
            // Details
            { x: 1450, y: 500, radius: 35, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],`;
const newBoss = `        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 220, angle: Math.PI, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1620, y: 330, radius: 130, angle: Math.PI, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1620, y: 670, radius: 130, angle: Math.PI, mass: 0.3, color: '#34495e' },
            // Details
            { x: 1400, y: 500, radius: 35, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],`;

code = code.replace(oldBoss, newBoss);

// Also need to fix the lasers on Level 5!
// If the wings are now pointing left (Math.PI), where should the lasers point?
// The lasers used to be -Math.PI/2 (UP) and Math.PI/2 (DOWN).
// That is actually perfectly fine, since the wings are sweeping and firing up/down vertically.
// So I don't need to change the laser angles.

fs.writeFileSync('game.js', code);
console.log('Final fixes applied');
