const fs = require('fs');

let game = fs.readFileSync('game.js', 'utf8');

const anchor = `const level = levels[currentLevel];
    let bodiesToRender = [];`;

const insert = `const level = levels[currentLevel];
    let bodiesToRender = [];
    
    // Boundary Box
    const minX = -1500;
    const maxX = 4500;
    const minY = -1500;
    const maxY = 2500;
    const thick = 200;
    const bOpts = { isStatic: true, render: { fillStyle: '#ff0055' }, label: 'boundary', friction: 0.1, restitution: 0.8 };
    bodiesToRender.push(
        Bodies.rectangle((minX+maxX)/2, minY - thick/2, maxX - minX + thick*2, thick, bOpts), // Top
        Bodies.rectangle((minX+maxX)/2, maxY + thick/2, maxX - minX + thick*2, thick, bOpts), // Bottom
        Bodies.rectangle(minX - thick/2, (minY+maxY)/2, thick, maxY - minY + thick*2, bOpts), // Left
        Bodies.rectangle(maxX + thick/2, (minY+maxY)/2, thick, maxY - minY + thick*2, bOpts)  // Right
    );`;

if (!game.includes('label: \'boundary\'')) {
    game = game.replace(anchor, insert);
    fs.writeFileSync('game.js', game);
    console.log("Injected boundaries properly.");
} else {
    console.log("Already injected.");
}
