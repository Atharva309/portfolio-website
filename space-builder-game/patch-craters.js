const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldCrater = `            if (p.style === 'cratered') {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                for(let i=0; i<7; i++) {
                    const cx = x + (rand(s++) - 0.5) * r * 1.5;
                    const cy = y + (rand(s++) - 0.5) * r * 1.5;
                    const cr = r * (0.1 + rand(s++) * 0.2);
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }`;
            
const newCrater = `            if (p.style === 'cratered') {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                const craters = [
                    { a: 0.5, d: 0.3, s: 0.25 },
                    { a: 2.1, d: 0.6, s: 0.18 },
                    { a: 3.8, d: 0.5, s: 0.2 },
                    { a: 5.2, d: 0.7, s: 0.15 }
                ];
                for (let c of craters) {
                    const cx = x + Math.cos(c.a) * r * c.d;
                    const cy = y + Math.sin(c.a) * r * c.d;
                    const cr = r * c.s;
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }`;

code = code.replace(oldCrater, newCrater);
fs.writeFileSync('game.js', code);
console.log('Craters patched');
