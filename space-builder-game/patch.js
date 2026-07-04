const fs = require('fs');

let code = fs.readFileSync('game.js', 'utf8');

// 1. Add levels
const levelsCode = fs.readFileSync('game-patch.js', 'utf8');
code = code.replace("let state = 'BUILD';", levelsCode + "\nlet state = 'BUILD';");

// 2. Update Reset Button
code = code.replace(
    "btnResetLevel.addEventListener('click', () => {\n    uiOverlay.classList.add('hidden');\n    startBuildMode();\n});",
    `btnResetLevel.addEventListener('click', () => {
    uiOverlay.classList.add('hidden');
    if (state === 'WON') {
        currentLevel = Math.min(currentLevel + 1, levels.length - 1);
    }
    startBuildMode();
});`
);

// 3. Update instructions to show level
code = code.replace(
    `instructions.innerText = "Build your rover. Press PLAY to test it.";`,
    `instructions.innerText = "Level " + (currentLevel + 1) + "/5: Build your ship. Press PLAY to launch.";`
);

// 4. Overwrite initPhysics and endGame
const newPhysics = `// ================= PHYSICS ENGINE =================
function initPhysics() {
    engine = Engine.create();
    engine.gravity.scale = 0; // ZERO GRAVITY
    
    render = Render.create({
        element: workspace,
        engine: engine,
        canvas: canvas,
        options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false,
            background: 'transparent',
            hasBounds: true
        }
    });

    const level = levels[currentLevel];
    let bodiesToRender = [];
    let levelPlanets = [];
    
    for (let p of level.planets) {
        const planetBody = Bodies.circle(p.x, p.y, p.radius, {
            isStatic: true,
            render: { fillStyle: p.color },
            label: 'planet'
        });
        planetBody.gravityMass = p.mass;
        levelPlanets.push(planetBody);
        bodiesToRender.push(planetBody);
    }
    
    goalSensor = Bodies.circle(level.goal.x, level.goal.y, level.goal.radius, {
        isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 240, 255, 0.3)' }, label: 'goal'
    });
    bodiesToRender.push(goalSensor);
    
    Composite.add(engine.world, bodiesToRender);

    let cockpitGridX = 0, cockpitGridY = 0;
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
    }
    
    carBody = bodyParts.length === 1 ? bodyParts[0] : Body.create({ parts: bodyParts, friction: 0.5, restitution: 0.2 });
    
    thrusterOffsets = thrusterData.map(t => ({
        x: t.absX - carBody.position.x,
        y: t.absY - carBody.position.y,
        dir: t.dir
    }));
    
    Composite.add(engine.world, carBody);

    Events.on(engine, 'beforeUpdate', () => {
        if (state !== 'DRIVE') return;
        
        if (carBody) {
            for (let planet of levelPlanets) {
                const dx = planet.position.x - carBody.position.x;
                const dy = planet.position.y - carBody.position.y;
                const distSq = dx * dx + dy * dy;
                const G = 50; 
                if (distSq > 100) {
                    const forceMag = (G * planet.gravityMass) / distSq;
                    const dist = Math.sqrt(distSq);
                    Body.applyForce(carBody, carBody.position, {
                        x: forceMag * (dx / dist),
                        y: forceMag * (dy / dist)
                    });
                }
            }
        
            let minX = Math.min(level.startPos.x, level.goal.x);
            let maxX = Math.max(level.startPos.x, level.goal.x);
            let minY = Math.min(level.startPos.y, level.goal.y);
            let maxY = Math.max(level.startPos.y, level.goal.y);

            for (let p of level.planets) {
                minX = Math.min(minX, p.x - p.radius);
                maxX = Math.max(maxX, p.x + p.radius);
                minY = Math.min(minY, p.y - p.radius);
                maxY = Math.max(maxY, p.y + p.radius);
            }
            
            minX -= 400; maxX += 400;
            minY -= 400; maxY += 400;
            
            minX = Math.min(minX, carBody.position.x - 400);
            maxX = Math.max(maxX, carBody.position.x + 400);
            minY = Math.min(minY, carBody.position.y - 400);
            maxY = Math.max(maxY, carBody.position.y + 400);

            Render.lookAt(render, {
                min: { x: minX, y: minY },
                max: { x: maxX, y: maxY }
            });
        }
        
        if (carBody) {
            for (let t of thrusterOffsets) {
                if (activeThrusters[t.dir]) {
                    const cos = Math.cos(carBody.angle);
                    const sin = Math.sin(carBody.angle);
                    const forcePoint = {
                        x: carBody.position.x + (t.x * cos - t.y * sin),
                        y: carBody.position.y + (t.x * sin + t.y * cos)
                    };
                    
                    let fx = 0, fy = 0;
                    if (t.dir === 'thruster-up') fy = -0.05;
                    if (t.dir === 'thruster-right') fx = 0.05;
                    if (t.dir === 'thruster-down') fy = 0.05;
                    if (t.dir === 'thruster-left') fx = -0.05;
                    
                    Body.applyForce(carBody, forcePoint, {
                        x: fx * cos - fy * sin,
                        y: fx * sin + fy * cos
                    });
                }
            }
        }
    });
    
    Events.on(render, 'afterRender', () => {
        if (state === 'DRIVE' && carBody) {
            for (let t of thrusterOffsets) {
                if (activeThrusters[t.dir]) {
                    const cos = Math.cos(carBody.angle);
                    const sin = Math.sin(carBody.angle);
                    const forcePoint = {
                        x: carBody.position.x + (t.x * cos - t.y * sin),
                        y: carBody.position.y + (t.x * sin + t.y * cos)
                    };
                    
                    let angleOffset = 0;
                    if (t.dir === 'thruster-right') angleOffset = Math.PI/2;
                    if (t.dir === 'thruster-down') angleOffset = Math.PI;
                    if (t.dir === 'thruster-left') angleOffset = -Math.PI/2;
                    
                    renderExhaust(forcePoint, carBody.angle + angleOffset);
                }
            }
        }
    });

    Events.on(engine, 'collisionStart', (event) => {
        for (let pair of event.pairs) {
            const { bodyA, bodyB } = pair;
            
            if (bodyA === goalSensor || bodyB === goalSensor) {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') endGame("Level " + (currentLevel + 1) + " Complete!", "linear-gradient(90deg, #00f0ff, #ff00ea)", true);
                }
            }
            
            if ((bodyA.label === 'cockpit' && bodyB.label === 'planet') || 
                (bodyB.label === 'cockpit' && bodyA.label === 'planet')) {
                if (state === 'DRIVE') endGame("Ship Destroyed!", "linear-gradient(90deg, #ff3366, #ff8833)", false);
            }
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);
}

function endGame(msg, gradient, isWin) {
    state = isWin ? 'WON' : 'LOST';
    uiOverlay.classList.remove('hidden');
    msgText.innerText = msg;
    msgText.style.background = gradient;
    msgText.style.webkitBackgroundClip = "text";
    btnResetLevel.innerText = isWin ? "Next Level" : "Try Again";
}
`;

// Replace everything from `// ================= PHYSICS ENGINE =================` up to `function renderExhaust(point, angle) {`
const physicsStart = code.indexOf('// ================= PHYSICS ENGINE =================');
const exhaustStart = code.indexOf('function renderExhaust(point, angle) {');
code = code.substring(0, physicsStart) + newPhysics + '\n' + code.substring(exhaustStart);

fs.writeFileSync('game.js', code);
console.log("Patched successfully!");
