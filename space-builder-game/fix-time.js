const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(`const time = engine.timing.timestamp;`, `const starTime = engine.timing.timestamp;`);
code = code.replace(`const alpha = 0.3 + (Math.sin(star.phase + time * star.speed) + 1) * 0.35;`, `const alpha = 0.3 + (Math.sin(star.phase + starTime * star.speed) + 1) * 0.35;`);

fs.writeFileSync('game.js', code);
console.log('Time fixed');
