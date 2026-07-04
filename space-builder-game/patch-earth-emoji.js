const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldEarth = `        if (currentLevel === 4) {
            // Earth
            ctx.rotate(time * 0.2);
            
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
            
        } else {`;
        
const newEarth = `        if (currentLevel === 4) {
            // Earth Emoji
            ctx.rotate(time * 0.2); // Slow rotation
            
            // Atmosphere glow behind emoji
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
            ctx.fill();
            
            ctx.font = \`\${level.goal.radius * 2}px sans-serif\`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Offset slightly for some emoji fonts not perfectly centering
            ctx.fillText('🌍', 0, level.goal.radius * 0.1); 
            
        } else {`;

if (code.indexOf(oldEarth) === -1) {
    console.error("Match failed!");
} else {
    code = code.replace(oldEarth, newEarth);
    fs.writeFileSync('game.js', code);
    console.log('Earth emoji patched');
}
