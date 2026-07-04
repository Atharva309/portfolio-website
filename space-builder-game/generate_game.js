const fs = require('fs');

const cleanCode = `// Elements
const workspace = document.getElementById('workspace');
const buildGridContainer = document.getElementById('build-grid-container');
const buildGrid = document.getElementById('build-grid');
const canvas = document.getElementById('game-canvas');
const inventoryPanel = document.getElementById('inventory');
const btnPlay = document.getElementById('btn-play');
const btnClear = document.getElementById('btn-clear');
const btnResetLevel = document.getElementById('btn-reset-level');
const uiOverlay = document.getElementById('message-overlay');
const msgText = document.getElementById('message-text');
const inventoryItems = document.querySelectorAll('.part-item');
const introOverlay = document.getElementById('intro-overlay');
const levelIndicator = document.getElementById('level-indicator');

// Matter.js
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Constraint = Matter.Constraint,
      Events = Matter.Events;

let engine, render, runner;

// Game State
let currentLevel = 0;
const levels = [
    {
        // Level 1: Simple Gravity Assist (No Defenses)
        startPos: { x: 500, y: 500 },
        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db' }
        ],
        defenses: [],
        goal: { x: 2500, y: 500, radius: 80 }
    },
    {
        // Level 2: Slingshot between two with 1 rocket launcher
        startPos: { x: 300, y: 300 },
        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c' },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 3000 } // Shoots every 3s from planet 0
        ],
        goal: { x: 2500, y: 200, radius: 80 }
    },
    {
        // Level 3: Planet wall with multiple rocket launchers
        startPos: { x: 300, y: 500 },
        planets: [
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f' },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 2500 },
            { type: 'rocket', planetIdx: 1, interval: 2500, offsetMs: 1250 }
        ],
        goal: { x: 2200, y: 500, radius: 80 }
    },
    {
        // Level 4: The massive sun + lasers and rockets
        startPos: { x: 300, y: 800 },
        planets: [
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c' },
            { x: 2300, y: 800, radius: 100, mass: 1.0, color: '#95a5a6' }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 0, interval: 2000 },
            { type: 'laser', x: 2000, y: 100, width: 20, height: 800, onMs: 2000, offMs: 2000 }
        ],
        goal: { x: 2700, y: 200, radius: 80 }
    },
    {
        // Level 5: Boss Ship
        startPos: { x: 200, y: 500 },
        planets: [
            // The Boss Ship is essentially made of static planets/shapes
            { x: 1500, y: 500, radius: 200, mass: 2.0, color: '#2c3e50' }, // Main hull
            { x: 1500, y: 250, radius: 80, mass: 0.5, color: '#34495e' }, // Top turret
            { x: 1500, y: 750, radius: 80, mass: 0.5, color: '#34495e' }, // Bottom turret
        ],
        defenses: [
            { type: 'laser', x: 1500, y: -50, width: 20, height: 300, onMs: 3000, offMs: 1000 },
            { type: 'laser', x: 1500, y: 1050, width: 20, height: 300, onMs: 3000, offMs: 1000 },
            { type: 'rocket', planetIdx: 1, interval: 1500 },
            { type: 'rocket', planetIdx: 2, interval: 1500, offsetMs: 750 },
            { type: 'rocket', planetIdx: 0, interval: 3000 }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    }
];

let state = 'BUILD';
let selectedPart = 'cockpit';
const gridMap = new Map(); // "col,row" -> "partName"

// Grid Math
const GRID_COLS = 12;
const GRID_ROWS = 8;
let CELL_SIZE = 40;
let gridOffsetX = 0;
let gridOffsetY = 0;

// Vehicle State
let carBody = null;
let thrusterOffsets = [];
let activeThrusters = {
    'thruster-up': false,
    'thruster-right': false,
    'thruster-down': false,
    'thruster-left': false
};
let goalSensor = null;
let isPainting = false;
let paintMode = 'add';

// ================= INITIALIZATION & LAYOUT =================
function initLayout() {
    const rect = workspace.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Fit grid inside workspace with some padding (leave 100px width for sidebar tools)
    const maxW = rect.width - 100;
    const maxH = rect.height - 40;
    CELL_SIZE = Math.floor(Math.min(maxW / GRID_COLS, maxH / GRID_ROWS));
    
    const gridWidth = CELL_SIZE * GRID_COLS;
    const gridHeight = CELL_SIZE * GRID_ROWS;
    
    buildGridContainer.style.width = \`\${gridWidth}px\`;
    buildGridContainer.style.height = \`\${gridHeight}px\`;
    
    buildGrid.style.gridTemplateColumns = \`repeat(\${GRID_COLS}, \${CELL_SIZE}px)\`;
    buildGrid.style.gridTemplateRows = \`repeat(\${GRID_ROWS}, \${CELL_SIZE}px)\`;
    
    // Position build grid on the left side of the screen
    gridOffsetX = 40;
    gridOffsetY = (rect.height - gridHeight) / 2;
}

function initDOMGrid() {
    buildGrid.innerHTML = '';
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.col = c;
            cell.dataset.row = r;
            
            const handlePaint = () => {
                if (!isPainting || state !== 'BUILD') return;
                const key = \`\${c},\${r}\`;
                
                if (paintMode === 'remove' || selectedPart === 'eraser') {
                    gridMap.delete(key);
                    cell.className = 'grid-cell';
                } else {
                    // Max 1 cockpit
                    if (selectedPart === 'cockpit') {
                        for (let [k, v] of gridMap.entries()) {
                            if (v === 'cockpit') {
                                gridMap.delete(k);
                                const oldCell = buildGrid.querySelector(\`.grid-cell[data-col="\${k.split(',')[0]}"][data-row="\${k.split(',')[1]}"]\`);
                                if (oldCell) oldCell.className = 'grid-cell';
                            }
                        }
                    }
                    gridMap.set(key, selectedPart);
                    cell.className = \`grid-cell cell-\${selectedPart}\`;
                }
            };
            
            cell.paint = handlePaint;
            
            cell.addEventListener('pointerdown', (e) => {
                isPainting = true;
                paintMode = (e.button === 2 || e.shiftKey) ? 'remove' : 'add';
                cell.releasePointerCapture(e.pointerId);
                handlePaint();
            });
            cell.addEventListener('pointerenter', (e) => {
                if (e.buttons > 0 || e.pointerType === 'touch') {
                    handlePaint();
                }
            });
            
            buildGrid.appendChild(cell);
        }
    }
}

// Global paint triggers
window.addEventListener('pointerup', () => isPainting = false);
window.addEventListener('pointercancel', () => isPainting = false);
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('touchmove', (e) => {
    if (state !== 'BUILD' || !isPainting) return;
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.paint) target.paint();
}, {passive: false});

// ================= UI CONTROLS =================
const thrusterDirs = ['thruster-up', 'thruster-right', 'thruster-down', 'thruster-left'];
const thrusterLabels = ['Up', 'Right', 'Down', 'Left'];
let currentThrusterIdx = 0;

inventoryItems.forEach(item => {
    item.addEventListener('click', () => {
        if (item.id === 'thruster-btn' && item.classList.contains('selected')) {
            currentThrusterIdx = (currentThrusterIdx + 1) % 4;
            const newPart = thrusterDirs[currentThrusterIdx];
            item.setAttribute('data-part', newPart);
            selectedPart = newPart;
            document.getElementById('thruster-label').innerText = \`Thruster (\${thrusterLabels[currentThrusterIdx]})\`;
            document.getElementById('thruster-icon').style.transform = \`rotate(\${currentThrusterIdx * 90}deg)\`;
        } else {
            inventoryItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedPart = item.getAttribute('data-part');
        }
    });
});

btnClear.addEventListener('click', () => {
    if (state === 'BUILD') {
        gridMap.clear();
        document.querySelectorAll('.grid-cell').forEach(c => c.className = 'grid-cell');
    }
});

btnPlay.addEventListener('click', () => {
    if (state === 'BUILD') startDriveMode();
    else startBuildMode();
});

btnResetLevel.addEventListener('click', () => {
    uiOverlay.classList.add('hidden');
    if (state === 'WON') {
        currentLevel = Math.min(currentLevel + 1, levels.length - 1);
    }
    startBuildMode();
});

window.addEventListener('keydown', (e) => {
    if (state === 'DRIVE') {
        switch(e.code) {
            case 'ArrowUp': activeThrusters['thruster-up'] = true; e.preventDefault(); break;
            case 'ArrowRight': activeThrusters['thruster-right'] = true; e.preventDefault(); break;
            case 'ArrowDown': activeThrusters['thruster-down'] = true; e.preventDefault(); break;
            case 'ArrowLeft': activeThrusters['thruster-left'] = true; e.preventDefault(); break;
            case 'Space': 
                activeThrusters['thruster-up'] = true;
                activeThrusters['thruster-right'] = true;
                activeThrusters['thruster-down'] = true;
                activeThrusters['thruster-left'] = true;
                e.preventDefault(); 
                break;
        }
    }
});
window.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowUp': activeThrusters['thruster-up'] = false; break;
        case 'ArrowRight': activeThrusters['thruster-right'] = false; break;
        case 'ArrowDown': activeThrusters['thruster-down'] = false; break;
        case 'ArrowLeft': activeThrusters['thruster-left'] = false; break;
        case 'Space': 
            activeThrusters['thruster-up'] = false;
            activeThrusters['thruster-right'] = false;
            activeThrusters['thruster-down'] = false;
            activeThrusters['thruster-left'] = false;
            break;
    }
});

// ================= GAME STATE =================
function startBuildMode() {
    state = 'BUILD';
    btnPlay.innerText = 'LAUNCH';
    btnPlay.classList.add('btn-primary');
    inventoryPanel.style.opacity = '1';
    inventoryPanel.style.pointerEvents = 'auto';
    buildGridContainer.classList.remove('hidden');
    canvas.classList.add('hidden');
    levelIndicator.innerText = "Level " + (currentLevel + 1) + "/5";
    
    if (engine) {
        Render.stop(render);
        Runner.stop(runner);
        Engine.clear(engine);
    }
}

function startDriveMode() {
    let hasCockpit = false;
    for (let val of gridMap.values()) if (val === 'cockpit') hasCockpit = true;
    
    if (!hasCockpit) {
        uiOverlay.classList.remove('hidden');
        msgText.innerText = "Place a Cockpit!";
        btnResetLevel.style.display = 'none';
        setTimeout(() => {
            uiOverlay.classList.add('hidden');
            btnResetLevel.style.display = 'inline-block';
        }, 1500);
        return;
    }
    
    state = 'STARTING';
    btnPlay.innerText = 'STOP / BUILD';
    btnPlay.classList.remove('btn-primary');
    inventoryPanel.style.opacity = '0.5';
    inventoryPanel.style.pointerEvents = 'none';
    buildGridContainer.classList.add('hidden');
    canvas.classList.remove('hidden');
    
    initLayout(); 
    initPhysics();

    introOverlay.classList.remove('hidden');
    setTimeout(() => {
        if (state === 'STARTING') {
            introOverlay.classList.add('hidden');
            state = 'DRIVE';
        }
    }, 2000);
}

function getPartColor(part) {
    if (part.startsWith('thruster')) return '#ffaa00';
    switch(part) {
        case 'cockpit': return '#00f0ff';
        case 'block': return '#5a6b8c';
        default: return '#fff';
    }
}

// ================= PHYSICS ENGINE =================
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
        isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 0, 0, 0)' }, label: 'goal'
    });
    bodiesToRender.push(goalSensor);

    let rockets = [];
    let lasers = [];

    if (level.defenses) {
        for (let def of level.defenses) {
            if (def.type === 'laser') {
                const laserBody = Bodies.rectangle(def.x, def.y, def.width, def.height, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(255, 0, 0, 0)' },
                    label: 'laser'
                });
                laserBody.def = def;
                laserBody.timer = def.offMs || 0;
                laserBody.isOn = false;
                lasers.push(laserBody);
                bodiesToRender.push(laserBody);
            }
            if (def.type === 'rocket') {
                const p = levelPlanets[def.planetIdx];
                if (p) {
                    p.rocketDef = def;
                    p.rocketTimer = def.offsetMs || 0;
                }
            }
        }
    }
    
    Composite.add(engine.world, bodiesToRender);

    let minC = 999, maxC = -1, maxR = -1;
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
    Composite.add(engine.world, [startPlanet, launchpad]);

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
    }
    
    carBody = bodyParts.length === 1 ? bodyParts[0] : Body.create({ parts: bodyParts, friction: 0.5, restitution: 0.2 });
    
    thrusterOffsets = thrusterData.map(t => ({
        x: t.absX - carBody.position.x,
        y: t.absY - carBody.position.y,
        dir: t.dir
    }));
    
    Composite.add(engine.world, carBody);

    Events.on(engine, 'beforeUpdate', () => {
        if (state !== 'DRIVE' && state !== 'STARTING') return;
        
        if (carBody) {
            if (state === 'DRIVE') {
                // Lasers logic
                for (let laser of lasers) {
                    laser.timer -= 16.66;
                    if (laser.isOn) {
                        if (laser.timer <= 0) {
                            laser.isOn = false;
                            laser.timer = laser.def.offMs;
                            laser.render.fillStyle = 'rgba(255, 0, 0, 0)';
                        }
                    } else {
                        if (laser.timer <= 0) {
                            laser.isOn = true;
                            laser.timer = laser.def.onMs;
                            laser.render.fillStyle = 'rgba(255, 0, 0, 0.8)';
                        }
                    }
                }
                
                // Rockets Spawning
                for (let p of levelPlanets) {
                    if (p.rocketDef) {
                        p.rocketTimer -= 16.66;
                        if (p.rocketTimer <= 0) {
                            p.rocketTimer = p.rocketDef.interval;
                            const rocket = Bodies.rectangle(p.position.x, p.position.y - p.radius - 20, 25, 10, {
                                render: { fillStyle: '#ff0000' },
                                frictionAir: 0.02,
                                label: 'rocket'
                            });
                            rockets.push(rocket);
                            Composite.add(engine.world, rocket);
                        }
                    }
                }
                
                // Rockets Homing
                for (let i = rockets.length - 1; i >= 0; i--) {
                    let r = rockets[i];
                    const dx = carBody.position.x - r.position.x;
                    const dy = carBody.position.y - r.position.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 0) {
                        const THRUST = 0.002;
                        Body.applyForce(r, r.position, {
                            x: (dx/dist) * THRUST,
                            y: (dy/dist) * THRUST
                        });
                        Body.setAngle(r, Math.atan2(dy, dx));
                    }
                }

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
        
        if (state === 'DRIVE' && carBody) {
            for (let t of thrusterOffsets) {
                if (activeThrusters[t.dir]) {
                    const cos = Math.cos(carBody.angle);
                    const sin = Math.sin(carBody.angle);
                    const forcePoint = {
                        x: carBody.position.x + (t.x * cos - t.y * sin),
                        y: carBody.position.y + (t.x * sin + t.y * cos)
                    };
                    
                    let fx = 0, fy = 0;
                    const THRUST = 0.015;
                    if (t.dir === 'thruster-up') fy = -THRUST;
                    if (t.dir === 'thruster-right') fx = THRUST;
                    if (t.dir === 'thruster-down') fy = THRUST;
                    if (t.dir === 'thruster-left') fx = -THRUST;
                    
                    Body.applyForce(carBody, forcePoint, {
                        x: fx * cos - fy * sin,
                        y: fx * sin + fy * cos
                    });
                }
            }
        }
    });
    
    Events.on(render, 'afterRender', () => {
        // Draw Wormhole
        const ctx = render.context;
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
        ctx.arc(0, 0, level.goal.radius - 20, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(255, 0, 234, \${0.5 + Math.cos(time*2)*0.3})\`;
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.restore();

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
            
            // Check lasers
            if ((bodyA.label === 'laser' && bodyA.isOn) || (bodyB.label === 'laser' && bodyB.isOn)) {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') endGame("Ship Destroyed by Laser!", "linear-gradient(90deg, #ff0000, #ff8833)", false);
                }
            }
            
            // Check rockets
            if (bodyA.label === 'rocket' || bodyB.label === 'rocket') {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') endGame("Ship Destroyed by Rocket!", "linear-gradient(90deg, #ff0000, #ff8833)", false);
                }
            }

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

function renderExhaust(point, angle) {
    const ctx = render.context;
    ctx.save();
    
    if (render.bounds) {
        const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
        const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
    }
    
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-CELL_SIZE*0.2, CELL_SIZE*0.6);
    ctx.lineTo(CELL_SIZE*0.2, CELL_SIZE*0.6);
    ctx.lineTo(0, CELL_SIZE*0.6 + Math.random() * CELL_SIZE);
    
    const grad = ctx.createLinearGradient(0, CELL_SIZE*0.6, 0, CELL_SIZE*1.6);
    grad.addColorStop(0, '#ffaa00');
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
}

// Startup
window.addEventListener('resize', () => {
    if (state === 'BUILD') initLayout();
});
initLayout();
initDOMGrid();
\`

fs.writeFileSync('game.js', cleanCode);
console.log('Fixed game.js completely!');
