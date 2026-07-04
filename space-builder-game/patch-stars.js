const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add stars array initialization
const initMarker = `let explosions = [];`;
const addStars = `let explosions = [];
let stars = [];
for(let i=0; i<400; i++) {
    stars.push({
        x: (Math.random() - 0.5) * 10000,
        y: (Math.random() - 0.5) * 10000,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
    });
}`;
code = code.replace(initMarker, addStars);

// 2. Make canvas transparent
code = code.replace(`background: '#0f172a' // Dark space blue`, `background: 'transparent' // Handled by CSS/Stars`);

// 3. Add destination-over drawing in afterRender
const afterRenderMarker = `        // Draw Wormhole`;
const drawStars = `        // Draw Stars behind everything
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }
        
        const time = engine.timing.timestamp;
        ctx.fillStyle = '#ffffff';
        for (let star of stars) {
            const alpha = 0.3 + (Math.sin(star.phase + time * star.speed) + 1) * 0.35;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        
        // Draw Wormhole`;
code = code.replace(afterRenderMarker, drawStars);

fs.writeFileSync('game.js', code);
console.log('Stars patched in game.js');
