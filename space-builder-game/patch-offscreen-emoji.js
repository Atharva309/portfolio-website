const fs = require('fs');

let game = fs.readFileSync('game.js', 'utf8');

const preRenderCode = `
// Pre-render Earth emoji to avoid macOS scaling bug
const earthCanvas = document.createElement('canvas');
earthCanvas.width = 300;
earthCanvas.height = 300;
const eCtx = earthCanvas.getContext('2d');
eCtx.font = "200px sans-serif";
eCtx.textAlign = 'center';
eCtx.textBaseline = 'middle';
eCtx.fillText('🌍', 150, 160);

const engine = Engine.create();
`;

game = game.replace('const engine = Engine.create();', preRenderCode);

const oldEarth = `            // Atmosphere glow behind emoji
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(100, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 255, 255, 0.6)';
            ctx.fill();
            ctx.restore();
            
            ctx.font = \`\${level.goal.radius * 2}px sans-serif\`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Offset slightly for some emoji fonts not perfectly centering
            ctx.fillText('🌍', 0, level.goal.radius * 0.1);`;

const newEarth = `            // Atmosphere glow behind emoji
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(100, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 255, 255, 0.6)';
            ctx.fill();
            ctx.restore();
            
            // Draw pre-rendered emoji image
            // Earth canvas is 300x300, we want it to fit in level.goal.radius * 2
            const imgSize = level.goal.radius * 2.5;
            ctx.drawImage(earthCanvas, -imgSize/2, -imgSize/2, imgSize, imgSize);`;

game = game.replace(oldEarth, newEarth);
fs.writeFileSync('game.js', game);
console.log('Offscreen canvas applied');
