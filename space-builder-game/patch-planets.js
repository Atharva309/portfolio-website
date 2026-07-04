const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Level updates
code = code.replace(
`        planets: [
            { x: 1000, y: 500, radius: 150, mass: 1.0, color: '#3498db' }
        ],`,
`        planets: [
            { x: 1000, y: 500, radius: 150, mass: 1.0, color: '#3498db', style: 'cratered', seed: 1 }
        ],`
);
code = code.replace(
`        planets: [
            { x: 1000, y: 200, radius: 120, mass: 0.8, color: '#f39c12' },
            { x: 1000, y: 800, radius: 120, mass: 0.8, color: '#9b59b6' }
        ],`,
`        planets: [
            { x: 1000, y: 200, radius: 120, mass: 0.8, color: '#f39c12', style: 'gas-giant', seed: 2 },
            { x: 1000, y: 800, radius: 120, mass: 0.8, color: '#9b59b6', style: 'cratered', seed: 3 }
        ],`
);
code = code.replace(
`        planets: [
            { x: 1200, y: 500, radius: 180, mass: 1.5, color: '#2ecc71' },
            { x: 1800, y: 200, radius: 100, mass: 0.8, color: '#34495e' }
        ],`,
`        planets: [
            { x: 1200, y: 500, radius: 180, mass: 1.5, color: '#2ecc71', style: 'ringed', seed: 4 },
            { x: 1800, y: 200, radius: 100, mass: 0.8, color: '#34495e', style: 'cratered', seed: 5 }
        ],`
);
code = code.replace(
`        planets: [
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c' },
            { x: 2300, y: 800, radius: 100, mass: 1.0, color: '#95a5a6' }
        ],`,
`        planets: [
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c', style: 'sun', seed: 6 },
            { x: 2300, y: 800, radius: 100, mass: 1.0, color: '#95a5a6', style: 'cratered', seed: 7 }
        ],`
);


// 2. Physics init
const oldPhysics = `        } else {
            planetBody = Bodies.circle(p.x, p.y, p.radius, {
                isStatic: true,
                render: { fillStyle: p.color },
                label: 'planet'
            });
        }`;
const newPhysics = `        } else {
            planetBody = Bodies.circle(p.x, p.y, p.radius, {
                isStatic: true,
                render: { fillStyle: p.style ? 'rgba(0,0,0,0)' : p.color },
                label: 'planet'
            });
            planetBody.style = p.style;
            planetBody.seed = p.seed || 1;
            planetBody.baseColor = p.color;
            planetBody.radius = p.radius;
        }`;
code = code.replace(oldPhysics, newPhysics);

// 3. Custom Planet Rendering in afterRender
const renderMarker = `        // Draw Wormhole`;
const planetRender = `        // Custom Planet Rendering
        ctx.save();
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }

        for (let p of levelPlanets) {
            if (!p.style) continue; // Polygon Boss shapes etc.
            
            const x = p.position.x;
            const y = p.position.y;
            const r = p.radius;
            const time = engine.timing.timestamp;
            
            // Random generator based on seed
            const rand = (s) => {
                let t = s += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            if (p.style === 'sun') {
                const pulse = Math.sin(time * 0.005) * 30;
                let radGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r + 150 + pulse);
                radGrad.addColorStop(0, '#ffffff');
                radGrad.addColorStop(0.2, p.baseColor);
                radGrad.addColorStop(1, 'rgba(231, 76, 60, 0)');
                
                ctx.beginPath();
                ctx.arc(x, y, r + 150 + pulse, 0, Math.PI * 2);
                ctx.fillStyle = radGrad;
                ctx.fill();
            }
            
            if (p.style === 'ringed') {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, Math.PI, Math.PI * 2);
                ctx.strokeStyle = \`rgba(255,255,255,0.15)\`;
                ctx.lineWidth = 30;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, Math.PI, Math.PI * 2);
                ctx.strokeStyle = \`rgba(255,255,255,0.3)\`;
                ctx.lineWidth = 15;
                ctx.stroke();
                ctx.restore();
            }

            // Draw base planet circle
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = p.baseColor;
            ctx.fill();
            
            // Inner texture details
            ctx.save();
            ctx.clip(); // clip drawing to the planet circle
            
            let s = p.seed;
            if (p.style === 'cratered') {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                for(let i=0; i<7; i++) {
                    const cx = x + (rand(s++) - 0.5) * r * 1.5;
                    const cy = y + (rand(s++) - 0.5) * r * 1.5;
                    const cr = r * (0.1 + rand(s++) * 0.2);
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.style === 'gas-giant') {
                for(let i=0; i<12; i++) {
                    const by = y - r + rand(s++) * r * 2;
                    const bh = r * 0.1 + rand(s++) * r * 0.2;
                    ctx.fillStyle = \`rgba(255,255,255,\${0.05 + rand(s++) * 0.15})\`;
                    if (rand(s++) > 0.5) ctx.fillStyle = \`rgba(0,0,0,\${0.05 + rand(s++) * 0.15})\`;
                    ctx.fillRect(x - r, by, r * 2, bh);
                }
            } else if (p.style === 'sun') {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                for(let i=0; i<4; i++) {
                    const cx = x + (rand(s++) - 0.5) * r * 1.2;
                    const cy = y + (rand(s++) - 0.5) * r * 1.2;
                    const cr = r * (0.15 + rand(s++) * 0.3);
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore(); 
            
            if (p.style === 'ringed') {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI);
                ctx.strokeStyle = \`rgba(255,255,255,0.3)\`;
                ctx.lineWidth = 30;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, 0, Math.PI);
                ctx.strokeStyle = \`rgba(255,255,255,0.6)\`;
                ctx.lineWidth = 15;
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.restore();
        
        // Draw Wormhole`;
code = code.replace(renderMarker, planetRender);

fs.writeFileSync('game.js', code);
console.log('Planets patched');
