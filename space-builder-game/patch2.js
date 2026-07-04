const fs = require('fs');

let code = fs.readFileSync('game.js', 'utf8');

const target1 = `    let cockpitGridX = 0, cockpitGridY = 0;
    for (let [key, part] of gridMap.entries()) {
        if (part === 'cockpit') {
            const [c, r] = key.split(',').map(Number);
            cockpitGridX = c * CELL_SIZE + CELL_SIZE/2;
            cockpitGridY = r * CELL_SIZE + CELL_SIZE/2;
        }
    }
    const worldOffsetX = level.startPos.x - cockpitGridX;
    const worldOffsetY = level.startPos.y - cockpitGridY;

    let bodyParts = [];
    let thrusterData = [];
    
    for (let [key, part] of gridMap.entries()) {
        const [col, row] = key.split(',').map(Number);
        const x = worldOffsetX + col * CELL_SIZE + CELL_SIZE/2;
        const y = worldOffsetY + row * CELL_SIZE + CELL_SIZE/2;
        
        if (part === 'cockpit' || part === 'block' || part.startsWith('thruster')) {
            bodyParts.push(Bodies.rectangle(x, y, CELL_SIZE, CELL_SIZE, {
                render: { fillStyle: getPartColor(part) },
                label: part
            }));
            if (part.startsWith('thruster')) thrusterData.push({ absX: x, absY: y, dir: part });
        }
    }`;

const replace1 = `    let minC = 999, maxC = -1, maxR = -1;
    for (let key of gridMap.keys()) {
        const [c, r] = key.split(',').map(Number);
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r > maxR) maxR = r;
    }
    
    const shipCenterX = ((minC + maxC) / 2) * CELL_SIZE + CELL_SIZE/2;
    const shipBottomY = maxR * CELL_SIZE + CELL_SIZE;

    const startPlanetRadius = 150;
    const startPlanetY = level.startPos.y + startPlanetRadius + 50; 
    
    const padWidth = 150;
    const padHeight = 20;
    const padY = startPlanetY - startPlanetRadius + 10;
    const padSurfaceY = padY - padHeight/2;

    const startPlanet = Bodies.circle(level.startPos.x, startPlanetY, startPlanetRadius, {
        isStatic: true, render: { fillStyle: '#2ecc71' }, label: 'planet'
    });
    startPlanet.gravityMass = 1.0; 
    
    const launchpad = Bodies.rectangle(level.startPos.x, padY, padWidth, padHeight, {
        isStatic: true, render: { fillStyle: '#95a5a6' }, label: 'launchpad'
    });
    
    levelPlanets.push(startPlanet);
    bodiesToRender.push(startPlanet);
    bodiesToRender.push(launchpad);

    const worldOffsetX = level.startPos.x - shipCenterX;
    const worldOffsetY = padSurfaceY - shipBottomY;

    let bodyParts = [];
    let thrusterData = [];
    
    for (let [key, part] of gridMap.entries()) {
        const [col, row] = key.split(',').map(Number);
        const x = worldOffsetX + col * CELL_SIZE + CELL_SIZE/2;
        const y = worldOffsetY + row * CELL_SIZE + CELL_SIZE/2;
        
        if (part === 'cockpit' || part === 'block') {
            bodyParts.push(Bodies.rectangle(x, y, CELL_SIZE, CELL_SIZE, {
                render: { fillStyle: getPartColor(part) },
                label: part
            }));
        } else if (part.startsWith('thruster')) {
            let angle = 0;
            if (part === 'thruster-right') angle = Math.PI/2;
            if (part === 'thruster-down') angle = Math.PI;
            if (part === 'thruster-left') angle = -Math.PI/2;
            
            bodyParts.push(Bodies.trapezoid(x, y, CELL_SIZE, CELL_SIZE, 0.5, {
                render: { fillStyle: getPartColor(part) },
                label: part,
                angle: angle
            }));
            thrusterData.push({ absX: x, absY: y, dir: part });
        }
    }`;

code = code.replace(target1, replace1);

const target2 = `                    let fx = 0, fy = 0;
                    if (t.dir === 'thruster-up') fy = -0.05;
                    if (t.dir === 'thruster-right') fx = 0.05;
                    if (t.dir === 'thruster-down') fy = 0.05;
                    if (t.dir === 'thruster-left') fx = -0.05;`;

const replace2 = `                    let fx = 0, fy = 0;
                    const THRUST = 0.015;
                    if (t.dir === 'thruster-up') fy = -THRUST;
                    if (t.dir === 'thruster-right') fx = THRUST;
                    if (t.dir === 'thruster-down') fy = THRUST;
                    if (t.dir === 'thruster-left') fx = -THRUST;`;

code = code.replace(target2, replace2); // Replace in beforeUpdate

fs.writeFileSync('game.js', code);
console.log("Patched successfully!");
