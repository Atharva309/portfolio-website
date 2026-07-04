const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Stop setting red fillStyle in beforeUpdate
code = code.replace(`                            laser.render.fillStyle = 'rgba(255, 0, 0, 0)';`, `                            // transparent`);
code = code.replace(`                            laser.render.fillStyle = 'rgba(255, 0, 0, 0.8)';`, `                            // handled in afterRender`);

// Add custom rendering in afterRender
const afterRenderMarker = `        if (state === 'DRIVE' && carBody) {`;
const customLaserRender = `        if (state === 'DRIVE' && carBody) {
            // Custom Laser Rendering
            for (let laser of lasers) {
                if (!laser.isOn) continue;
                
                ctx.save();
                if (render.bounds) {
                    const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                    const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
                }
                
                // laser.position is the center of the 5000px line
                ctx.translate(laser.position.x, laser.position.y);
                ctx.rotate(laser.angle);
                
                // Draw multiple overlapping rectangles for a glowing/burning beam effect
                // Outer glow (Red)
                ctx.fillStyle = \`rgba(255, 0, 0, \${0.3 + Math.random()*0.2})\`;
                ctx.fillRect(-2500, -20, 5000, 40);
                
                // Inner beam (Bright Orange)
                ctx.fillStyle = \`rgba(255, \${100 + Math.random()*50}, 0, 0.8)\`;
                ctx.fillRect(-2500, -10, 5000, 20);
                
                // Core (White-Yellow)
                ctx.fillStyle = \`rgba(255, 255, 200, 1)\`;
                ctx.fillRect(-2500, -4, 5000, 8);
                
                ctx.restore();
            }`;

code = code.replace(afterRenderMarker, customLaserRender);

fs.writeFileSync('game.js', code);
console.log('Burning Laser patched successfully');
