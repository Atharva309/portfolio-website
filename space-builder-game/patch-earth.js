const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldGoal = `        // Draw Wormhole
        ctx.save();
        
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }
        
        const time = Date.now() / 500;
        ctx.translate(level.goal.x, level.goal.y);
        ctx.rotate(time);
        
        ctx.beginPath();
        ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(0, 240, 255, \${0.5 + Math.sin(time*2)*0.3})\`;
        ctx.lineWidth = 10;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, level.goal.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(255, 0, 234, \${0.3 + Math.cos(time)*0.2})\`;
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Inner spinning star
        ctx.beginPath();
        for(let i=0; i<5; i++) {
            ctx.lineTo(Math.cos(i*Math.PI*2/5)*level.goal.radius*0.4, Math.sin(i*Math.PI*2/5)*level.goal.radius*0.4);
            ctx.lineTo(Math.cos((i+0.5)*Math.PI*2/5)*level.goal.radius*0.15, Math.sin((i+0.5)*Math.PI*2/5)*level.goal.radius*0.15);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
        
        ctx.restore();`;

const newGoal = `        // Draw Goal (Wormhole or Earth)
        ctx.save();
        
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }
        
        const time = Date.now() / 500;
        ctx.translate(level.goal.x, level.goal.y);
        
        if (currentLevel === 4) {
            // Earth
            ctx.rotate(time * 0.2); // Slow rotation for Earth
            
            // Ocean
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#0a6ebd';
            ctx.fill();
            
            // Continents
            ctx.fillStyle = '#22c55e';
            
            // Continent 1
            ctx.beginPath();
            ctx.arc(-level.goal.radius*0.3, -level.goal.radius*0.2, level.goal.radius*0.4, 0, Math.PI*2);
            ctx.arc(-level.goal.radius*0.1, -level.goal.radius*0.4, level.goal.radius*0.3, 0, Math.PI*2);
            ctx.arc(-level.goal.radius*0.4, -level.goal.radius*0.0, level.goal.radius*0.25, 0, Math.PI*2);
            ctx.fill();
            
            // Continent 2
            ctx.beginPath();
            ctx.arc(level.goal.radius*0.4, level.goal.radius*0.2, level.goal.radius*0.45, 0, Math.PI*2);
            ctx.arc(level.goal.radius*0.2, level.goal.radius*0.5, level.goal.radius*0.3, 0, Math.PI*2);
            ctx.fill();
            
            // Continent 3
            ctx.beginPath();
            ctx.arc(level.goal.radius*0.3, -level.goal.radius*0.5, level.goal.radius*0.2, 0, Math.PI*2);
            ctx.fill();
            
            // Atmosphere glow
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
            ctx.lineWidth = 8;
            ctx.stroke();
            
        } else {
            // Normal Wormhole
            ctx.rotate(time);
            
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.strokeStyle = \`rgba(0, 240, 255, \${0.5 + Math.sin(time*2)*0.3})\`;
            ctx.lineWidth = 10;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = \`rgba(255, 0, 234, \${0.3 + Math.cos(time)*0.2})\`;
            ctx.lineWidth = 5;
            ctx.stroke();
            
            // Inner spinning star
            ctx.beginPath();
            for(let i=0; i<5; i++) {
                ctx.lineTo(Math.cos(i*Math.PI*2/5)*level.goal.radius*0.4, Math.sin(i*Math.PI*2/5)*level.goal.radius*0.4);
                ctx.lineTo(Math.cos((i+0.5)*Math.PI*2/5)*level.goal.radius*0.15, Math.sin((i+0.5)*Math.PI*2/5)*level.goal.radius*0.15);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
        }
        
        ctx.restore();`;

code = code.replace(oldGoal, newGoal);
fs.writeFileSync('game.js', code);
console.log('Added Earth for level 5');
