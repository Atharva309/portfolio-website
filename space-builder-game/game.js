// Elements
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


// Pre-render Earth emoji to avoid macOS scaling bug
const earthCanvas = document.createElement('canvas');
earthCanvas.width = 300;
earthCanvas.height = 300;
const eCtx = earthCanvas.getContext('2d');
eCtx.font = "200px sans-serif";
eCtx.textAlign = 'center';
eCtx.textBaseline = 'middle';
eCtx.fillText('🌍', 150, 160);

let engine, render, runner;

// Game State
let currentLevel = 0;
const levels = [
    {
        // Level 1: Simple Gravity Assist (No Defenses)
        startPos: { x: 500, y: 500 },
        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db', style: 'cratered', seed: 1 }
        ],
        defenses: [],
        goal: { x: 2500, y: 500, radius: 80 }
    },
    {
        // Level 2: Slingshot between two with 1 rocket launcher
        startPos: { x: 300, y: 300 },
        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c', style: 'gas-giant', seed: 2 },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6', style: 'cratered', seed: 3 }
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
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f', style: 'ringed', seed: 4 },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22', style: 'gas-giant', seed: 5 }
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
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c', style: 'sun', seed: 6 },
            { x: 2300, y: 800, radius: 100, mass: 1.0, color: '#95a5a6', style: 'cratered', seed: 7 }
        ],
        defenses: [
            { type: 'rocket', planetIdx: 1, interval: 2000 },
            { type: 'laser', planetIdx: 0, angle: -Math.PI/2, width: 20, onMs: 2000, offMs: 2000 }
        ],
        goal: { x: 2700, y: 200, radius: 80 }
    },
    {
        // Level 5: Pointy Boss Ship + Drones
        startPos: { x: 200, y: 500 },
        planets: [
            // Hull
            { shape: 'polygon', sides: 3, x: 1600, y: 500, radius: 320, angle: 0, mass: 1.5, color: '#2c3e50' },
            { shape: 'polygon', sides: 3, x: 1620, y: 330, radius: 130, angle: Math.PI, mass: 0.3, color: '#34495e' },
            { shape: 'polygon', sides: 3, x: 1620, y: 670, radius: 130, angle: Math.PI, mass: 0.3, color: '#34495e' },
            // Details
            { x: 1400, y: 500, radius: 35, mass: 0.1, color: '#c0392b' } // Scary Red Cockpit Eye
        ],
        defenses: [
            { type: 'laser', planetIdx: 1, angle: -Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'laser', planetIdx: 2, angle: Math.PI/2, width: 20, onMs: 3000, offMs: 4000 },
            { type: 'drone', x: 1200, y: 250 },
            { type: 'drone', x: 1200, y: 750 },
            { type: 'drone', x: 2000, y: 200 },
            { type: 'drone', x: 2000, y: 800 }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    }
];

function fadeTransition(callback) {
    const overlay = document.getElementById('transition-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        callback();
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 50);
    }, 500);
}

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
let explosions = [];
let stars = [];
for(let i=0; i<3000; i++) {
    stars.push({
        x: (Math.random() * 8000) - 2000,
        y: (Math.random() * 6000) - 2000,
        size: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.08
    });
}

// ================= INITIALIZATION & LAYOUT =================
function initLayout() {
    let rect = workspace.getBoundingClientRect();
    
    // Robust fallback if workspace layout hasn't flushed properly yet
    let w = rect.width > 100 ? rect.width : window.innerWidth;
    let h = rect.height > 100 ? rect.height : (window.innerHeight - 120);
    
    canvas.width = w;
    canvas.height = h;
    
    // Fit grid inside workspace with some padding
    const maxW = w - 100;
    const maxH = h - 40;
    CELL_SIZE = Math.floor(Math.min(maxW / GRID_COLS, maxH / GRID_ROWS));
    
    if (CELL_SIZE < 20) CELL_SIZE = 40; // Hard fallback to prevent 0-size grid
    
    const gridWidth = CELL_SIZE * GRID_COLS;
    const gridHeight = CELL_SIZE * GRID_ROWS;
    
    buildGridContainer.style.width = `${gridWidth}px`;
    buildGridContainer.style.height = `${gridHeight}px`;
    
    buildGrid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL_SIZE}px)`;
    buildGrid.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`;
    
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
                const key = `${c},${r}`;
                
                if (paintMode === 'remove' || selectedPart === 'eraser') {
                    gridMap.delete(key);
                    cell.className = 'grid-cell';
                } else {
                    // Max 1 cockpit
                    if (selectedPart === 'cockpit') {
                        for (let [k, v] of gridMap.entries()) {
                            if (v === 'cockpit') {
                                gridMap.delete(k);
                                const oldCell = buildGrid.querySelector(`.grid-cell[data-col="${k.split(',')[0]}"][data-row="${k.split(',')[1]}"]`);
                                if (oldCell) oldCell.className = 'grid-cell';
                            }
                        }
                    }
                    gridMap.set(key, selectedPart);
                    cell.className = `grid-cell cell-${selectedPart}`;
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
            document.getElementById('thruster-label').innerText = `Thruster (${thrusterLabels[currentThrusterIdx]})`;
            document.getElementById('thruster-icon').style.transform = `rotate(${currentThrusterIdx * 90}deg)`;
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
        if (currentLevel === levels.length - 1) {
            currentLevel = 0;
        } else {
            currentLevel = Math.min(currentLevel + 1, levels.length - 1);
        }
    }
    startBuildMode();
});

window.addEventListener('keydown', (e) => {
    // Debug hotkeys
    if (e.key === '1') { currentLevel = 0; startBuildMode(); return; }
    if (e.key === '2') { currentLevel = 1; startBuildMode(); return; }
    if (e.key === '3') { currentLevel = 2; startBuildMode(); return; }
    if (e.key === '4') { currentLevel = 3; startBuildMode(); return; }
    if (e.key === '5') { currentLevel = 4; startBuildMode(); return; }

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
    fadeTransition(() => {
        _internalStartBuildMode();
    });
}
function _internalStartBuildMode() {
    state = 'BUILD';
    btnPlay.innerText = 'LAUNCH';
    btnPlay.classList.add('btn-primary');
    document.querySelector('.inventory-left').style.opacity = '1';
    document.querySelector('.inventory-left').style.pointerEvents = 'auto';
    buildGridContainer.classList.remove('hidden');
    canvas.classList.add('hidden');
    levelIndicator.innerText = "Level " + (currentLevel + 1) + "/5";
    initLayout(); // Fix for disappearing grid
    
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
    document.querySelector('.inventory-left').style.opacity = '0.5';
    document.querySelector('.inventory-left').style.pointerEvents = 'none';
    buildGridContainer.classList.add('hidden');
    canvas.classList.remove('hidden');
    
    initLayout(); 
    initPhysics();

    const introText = introOverlay.querySelector('h2');
    if (introText) {
        if (currentLevel === 4) {
            introText.innerText = "REACH EARTH";
        } else {
            introText.innerText = "REACH THE WORMHOLE";
        }
    }
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
    explosions = [];
    
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
    
    // Boundary Box
    const minX = -1500;
    const maxX = 4500;
    const minY = -1500;
    const maxY = 2500;
    const thick = 50;
    const bOpts = { isStatic: true, render: { fillStyle: '#5a0a1a' }, label: 'boundary', friction: 0.1, restitution: 0.8 };
    bodiesToRender.push(
        Bodies.rectangle((minX+maxX)/2, minY - thick/2, maxX - minX + thick*2, thick, bOpts), // Top
        Bodies.rectangle((minX+maxX)/2, maxY + thick/2, maxX - minX + thick*2, thick, bOpts), // Bottom
        Bodies.rectangle(minX - thick/2, (minY+maxY)/2, thick, maxY - minY + thick*2, bOpts), // Left
        Bodies.rectangle(maxX + thick/2, (minY+maxY)/2, thick, maxY - minY + thick*2, bOpts)  // Right
    );
    let levelPlanets = [];
    
    for (let p of level.planets) {
        let planetBody;
        if (p.shape === 'polygon') {
            planetBody = Bodies.polygon(p.x, p.y, p.sides || 3, p.radius, {
                isStatic: true,
                angle: p.angle || 0,
                render: { fillStyle: p.color },
                label: 'planet'
            });
        } else {
            planetBody = Bodies.circle(p.x, p.y, p.radius, {
                isStatic: true,
                render: { fillStyle: p.style ? 'rgba(0,0,0,0)' : p.color },
                label: 'planet'
            });
            planetBody.style = p.style;
            planetBody.seed = p.seed || 1;
            planetBody.baseColor = p.color;
            planetBody.radius = p.radius;
        }
        planetBody.gravityMass = p.mass;
        levelPlanets.push(planetBody);
        bodiesToRender.push(planetBody);
    }
    
    goalSensor = Bodies.circle(level.goal.x, level.goal.y, level.goal.radius, {
        isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 0, 0, 0)' }, label: 'goal'
    });
    bodiesToRender.push(goalSensor);

    let rockets = [];
let drones = [];
    let lasers = [];

    if (level.defenses) {
        for (let def of level.defenses) {
            if (def.type === 'laser') {
                const p = levelPlanets[def.planetIdx];
                if (p) {
                    const length = 5000; // "Infinitely" long
                    const angle = def.angle;
                    
                    const distToCenter = p.circleRadius + length/2;
                    const cx = p.position.x + Math.cos(angle) * distToCenter;
                    const cy = p.position.y + Math.sin(angle) * distToCenter;
                    
                    const laserBody = Bodies.rectangle(cx, cy, length, def.width, {
                        isStatic: true,
                        isSensor: true,
                        angle: angle,
                        render: { fillStyle: 'rgba(255, 0, 0, 0)' },
                        label: 'laser'
                    });
                    laserBody.def = def;
                    laserBody.timer = def.offMs || 0;
                    laserBody.isOn = false;
                    laserBody.pOrigin = p.position; // Store planet origin for rendering
                    laserBody.pRadius = p.circleRadius;
                    lasers.push(laserBody);
                    bodiesToRender.push(laserBody);
                    
                    // Add physical laser emitter structure on the planet surface
                    const ex = p.position.x + Math.cos(angle) * (p.circleRadius + 10);
                    const ey = p.position.y + Math.sin(angle) * (p.circleRadius + 10);
                    const emitter = Bodies.rectangle(ex, ey, 40, 20, {
                        isStatic: true,
                        angle: angle + Math.PI/2,
                        render: { fillStyle: '#c0392b' },
                        label: 'emitter'
                    });
                    bodiesToRender.push(emitter);
                }
            }

            if (def.type === 'drone') {
                const drone = Bodies.polygon(def.x, def.y, 3, 30, {
                    frictionAir: 0.08,
                    render: { fillStyle: 'rgba(0,0,0,0)' }, // Transparent for custom render
                    label: 'rocket' 
                });
                drone.rocketTimer = 5000; // 5 seconds initial delay before firing
                drones.push(drone);
                bodiesToRender.push(drone);
            }
            if (def.type === 'rocket') {
                const p = levelPlanets[def.planetIdx];
                if (p) {
                    p.rocketDef = def;
                    p.rocketTimer = def.offsetMs !== undefined ? def.offsetMs : 2000;
                    
                    // Add physical rocket launcher base structure
                    const launcherBase = Bodies.rectangle(p.position.x, p.position.y - p.circleRadius - 10, 40, 20, {
                        isStatic: true,
                        render: { fillStyle: '#34495e' },
                        label: 'launcher'
                    });
                    bodiesToRender.push(launcherBase);
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

            // Drones Logic
            if (state === 'DRIVE' || state === 'STARTING') {
                for (let drone of drones) {
                    const dx = carBody.position.x - drone.position.x;
                    const dy = carBody.position.y - drone.position.y;
                    
                    const targetAngle = Math.atan2(dy, dx);
                    let angleDiff = targetAngle - drone.angle;
                    while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    
                    const maxTurn = 0.02;
                    const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
                    Body.setAngle(drone, drone.angle + turn);
                    
                    if (state === 'DRIVE') {
                        const THRUST = 0.0001;
                        Body.applyForce(drone, drone.position, {
                            x: Math.cos(drone.angle) * THRUST,
                            y: Math.sin(drone.angle) * THRUST
                        });
                    }
                    
                    // Rocket firing
                    if (state === 'DRIVE') {
                        drone.rocketTimer -= 16.66;
                        if (drone.rocketTimer <= 0) {
                            drone.rocketTimer = 4000; // fire every 4s
                            
                            // Spawn rocket at drone nose
                            const noseX = drone.position.x + Math.cos(drone.angle) * 40;
                            const noseY = drone.position.y + Math.sin(drone.angle) * 40;
                            
                            const rocket = Bodies.rectangle(noseX, noseY, 30, 12, {
                                render: { fillStyle: 'rgba(0,0,0,0)' },
                                frictionAir: 0.05,
                                angle: drone.angle,
                                label: 'rocket'
                            });
                            rocket.age = 0;
                            rockets.push(rocket);
                            Composite.add(engine.world, rocket);
                        }
                    }
                }
            }
            // Lasers logic (Update timers during STARTING too so they blink correctly)
            if (state === 'DRIVE' || state === 'STARTING') {
                for (let laser of lasers) {
                    laser.timer -= 16.66;
                    if (laser.isOn) {
                        if (laser.timer <= 0) {
                            laser.isOn = false;
                            laser.timer = laser.def.offMs;
                            // transparent
                        }
                    } else {
                        if (laser.timer <= 0) {
                            laser.isOn = true;
                            laser.timer = laser.def.onMs;
                            // handled in afterRender
                        }
                    }
                }
                
            }
            if (state === 'DRIVE') {
                // Rockets Spawning
                for (let p of levelPlanets) {
                    if (p.rocketDef) {
                        p.rocketTimer -= 16.66;
                        if (p.rocketTimer <= 0) {
                            p.rocketTimer = p.rocketDef.interval;
                            const rocket = Bodies.rectangle(p.position.x, p.position.y - p.circleRadius - 20, 30, 12, {
                                render: { fillStyle: 'rgba(0,0,0,0)' }, // Transparent for custom render
                                frictionAir: 0.05,
                                label: 'rocket'
                            });
                            rocket.age = 0;
                            rockets.push(rocket);
                            Composite.add(engine.world, rocket);
                        }
                    }
                }
                
                // Rockets Homing & Lifespan
                for (let i = rockets.length - 1; i >= 0; i--) {
                    let r = rockets[i];
                    r.age += 16.66;
                    if (r.age > 9000) { // 9 second lifespan
                        Composite.remove(engine.world, r);
                        rockets.splice(i, 1);
                        continue;
                    }
                    
                    const dx = carBody.position.x - r.position.x;
                    const dy = carBody.position.y - r.position.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Only home if within 1000px
                    if (dist > 0 && dist < 1000) {
                        const targetAngle = Math.atan2(dy, dx);
                        let angleDiff = targetAngle - r.angle;
                        
                        // Normalize angle diff to -PI to PI
                        while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        
                        const maxTurn = 0.03; // Limited turn radius
                        const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
                        Body.setAngle(r, r.angle + turn);
                    }
                    
                    // Apply thrust in the direction it's currently facing
                    const THRUST = 0.00015; // Slowed down
                    Body.applyForce(r, r.position, {
                        x: Math.cos(r.angle) * THRUST,
                        y: Math.sin(r.angle) * THRUST
                    });
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
        
        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
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
        const ctx = render.context;
        
        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {


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
                ctx.translate(laser.position.x, laser.position.y);
                ctx.rotate(laser.angle);
                
                ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.random()*0.2})`;
                ctx.fillRect(-2500, -20, 5000, 40);
                
                ctx.fillStyle = `rgba(255, ${100 + Math.random()*50}, 0, 0.8)`;
                ctx.fillRect(-2500, -10, 5000, 20);
                
                ctx.fillStyle = `rgba(255, 255, 200, 1)`;
                ctx.fillRect(-2500, -4, 5000, 8);
                
                ctx.restore();
            }
        }
        
        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
            // Custom Drone Rendering
            for (let drone of drones) {
                ctx.save();
                if (render.bounds) {
                    const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                    const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
                }
                ctx.translate(drone.position.x, drone.position.y);
                ctx.rotate(drone.angle);
                
                // Body (Purple Triangle)
                ctx.fillStyle = '#8e44ad';
                ctx.beginPath();
                ctx.moveTo(30, 0);   
                ctx.lineTo(-15, 20); 
                ctx.lineTo(-15, -20); 
                ctx.fill();
                
                // Cockpit (Red window)
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.arc(5, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Thruster (Cyan exhaust)
                ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + Math.random()*0.5})`;
                ctx.beginPath();
                ctx.moveTo(-15, -12);
                ctx.lineTo(-15 - Math.random()*25, 0);
                ctx.lineTo(-15, 12);
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        // Explosions
        for (let i = explosions.length - 1; i >= 0; i--) {
            let exp = explosions[i];
            exp.age += 16.66;
            if (exp.age > exp.maxAge) {
                explosions.splice(i, 1);
                continue;
            }
            
            ctx.save();
            if (render.bounds) {
                const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                ctx.scale(scaleX, scaleY);
                ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
            }
            ctx.translate(exp.x, exp.y);
            
            const progress = exp.age / exp.maxAge;
            const radius = progress * 150; 
            const alpha = 1 - progress;
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
            ctx.fill();
            
            ctx.restore();
        }
        // Draw Stars behind everything
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }
        
        const starTime = engine.timing.timestamp;
        ctx.fillStyle = '#ffffff';
        for (let star of stars) {
            const rawAlpha = Math.sin(star.phase + starTime * star.speed);
            const alpha = Math.max(0, rawAlpha * 1.5 - 0.5);
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        
        // Custom Planet Rendering
        ctx.save();
        if (render.bounds) {
            const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
            const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
        }

        for (let p of levelPlanets) {
            if (!p.style) continue; // Polygon Boss shapes etc.
            
            const x = p.position.x;
            const y = p.position.y;
            const r = p.radius;
            const time = engine.timing.timestamp;
            
            // Random generator based on seed
            const rand = (s) => {
                let t = s += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            if (p.style === 'sun') {
                const pulse = Math.sin(time * 0.005) * 30;
                let radGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r + 150 + pulse);
                radGrad.addColorStop(0, '#ffffff');
                radGrad.addColorStop(0.2, p.baseColor);
                radGrad.addColorStop(1, 'rgba(231, 76, 60, 0)');
                
                ctx.beginPath();
                ctx.arc(x, y, r + 150 + pulse, 0, Math.PI * 2);
                ctx.fillStyle = radGrad;
                ctx.fill();
            }
            
            if (p.style === 'ringed') {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, Math.PI, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,0.15)`;
                ctx.lineWidth = 30;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, Math.PI, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,0.3)`;
                ctx.lineWidth = 15;
                ctx.stroke();
                ctx.restore();
            }

            // Draw base planet circle
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = p.baseColor;
            ctx.fill();
            
            // Inner texture details
            ctx.save();
            ctx.clip(); // clip drawing to the planet circle
            
            let s = p.seed;
            if (p.style === 'cratered') {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                const craters = [
                    { a: 0.5, d: 0.3, s: 0.25 },
                    { a: 2.1, d: 0.6, s: 0.18 },
                    { a: 3.8, d: 0.5, s: 0.2 },
                    { a: 5.2, d: 0.7, s: 0.15 }
                ];
                for (let c of craters) {
                    const cx = x + Math.cos(c.a) * r * c.d;
                    const cy = y + Math.sin(c.a) * r * c.d;
                    const cr = r * c.s;
                    ctx.beginPath();
                    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.style === 'gas-giant') {
                for(let i=0; i<12; i++) {
                    const by = y - r + rand(s++) * r * 2;
                    const bh = r * 0.1 + rand(s++) * r * 0.2;
                    ctx.fillStyle = `rgba(255,255,255,${0.05 + rand(s++) * 0.15})`;
                    if (rand(s++) > 0.5) ctx.fillStyle = `rgba(0,0,0,${0.05 + rand(s++) * 0.15})`;
                    ctx.fillRect(x - r, by, r * 2, bh);
                }
            } // Added missing closing brace

            ctx.restore(); 
            
            if (p.style === 'ringed') {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI);
                ctx.strokeStyle = `rgba(255,255,255,0.3)`;
                ctx.lineWidth = 30;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, 0, Math.PI);
                ctx.strokeStyle = `rgba(255,255,255,0.6)`;
                ctx.lineWidth = 15;
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.restore();
        
        // Draw Goal (Wormhole or Earth)
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
            // Earth Emoji
            ctx.rotate(time * 0.2); // Slow rotation
            
            // Atmosphere glow behind emoji
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
            ctx.drawImage(earthCanvas, -imgSize/2, -imgSize/2, imgSize, imgSize); 
            
        } else {
            // Normal Wormhole
            ctx.rotate(time);
            
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 + Math.sin(time*2)*0.3})`;
            ctx.lineWidth = 10;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, level.goal.radius - 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 234, ${0.5 + Math.cos(time*2)*0.3})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }
        
        ctx.restore();

        if ((state === 'DRIVE' || state === 'STARTING') && carBody) {
            // Custom Rocket Rendering
            for (let r of rockets) {
                ctx.save();
                if (render.bounds) {
                    const scaleX = canvas.width / (render.bounds.max.x - render.bounds.min.x);
                    const scaleY = canvas.height / (render.bounds.max.y - render.bounds.min.y);
                    ctx.scale(scaleX, scaleY);
                    ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
                }
                ctx.translate(r.position.x, r.position.y);
                ctx.rotate(r.angle);
                
                // Body (Gray)
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(-15, -6, 20, 12);
                
                // Nose Cone (Red)
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(5, -6);
                ctx.lineTo(15, 0);
                ctx.lineTo(5, 6);
                ctx.fill();
                
                // Exhaust Flame (Orange/Yellow)
                ctx.fillStyle = `rgba(255, ${Math.random()*150 + 50}, 0, ${0.8})`;
                ctx.beginPath();
                ctx.moveTo(-15, -4);
                ctx.lineTo(-15 - Math.random()*15 - 10, 0);
                ctx.lineTo(-15, 4);
                ctx.fill();
                
                ctx.restore();
            }

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
                    if (state === 'DRIVE') {
                        explosions.push({ x: carBody.position.x, y: carBody.position.y, age: 0, maxAge: 1000 });
                        carBody.render.visible = false;
                        for (let part of carBody.parts) part.render.visible = false;
                        endGame("Ship Destroyed by Laser!", "linear-gradient(90deg, #ff0000, #ff8833)", false);
                    }
                }
            }
            
            // Check rockets
            if (bodyA.label === 'rocket' || bodyB.label === 'rocket') {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') {
                        explosions.push({ x: carBody.position.x, y: carBody.position.y, age: 0, maxAge: 1000 });
                        carBody.render.visible = false;
                        for (let part of carBody.parts) part.render.visible = false;
                        
                        // Hide rockets in case they keep drawing
                        if (bodyA.label === 'rocket') Composite.remove(engine.world, bodyA);
                        if (bodyB.label === 'rocket') Composite.remove(engine.world, bodyB);
                        
                        endGame("Ship Destroyed by Rocket!", "linear-gradient(90deg, #ff0000, #ff8833)", false);
                    }
                }
            }

            if (bodyA === goalSensor || bodyB === goalSensor) {
                if (bodyA.parent === carBody || bodyB.parent === carBody) {
                    if (state === 'DRIVE') {
                        if (currentLevel === levels.length - 1) {
                            endGame("GALAXY SAVED!", "linear-gradient(90deg, #ffd700, #ff8c00)", true);
                        } else {
                            endGame("Level " + (currentLevel + 1) + " Complete!", "linear-gradient(90deg, #00f0ff, #ff00ea)", true);
                        }
                    }
                }
            }
            
            if ((bodyA.label === 'cockpit' && bodyB.label === 'planet') || 
                (bodyB.label === 'cockpit' && bodyA.label === 'planet')) {
                if (state === 'DRIVE') {
                    explosions.push({ x: carBody.position.x, y: carBody.position.y, age: 0, maxAge: 1000 });
                    carBody.render.visible = false;
                    for (let part of carBody.parts) part.render.visible = false;
                    endGame("Ship Destroyed!", "linear-gradient(90deg, #ff3366, #ff8833)", false);
                }
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
    
    if (isWin && currentLevel === levels.length - 1) {
        btnResetLevel.innerText = "Play Again";
        if (window.confetti) {
            let duration = 3000;
            let end = Date.now() + duration;
            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#00f0ff', '#ff00ea', '#ffd700']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#00f0ff', '#ff00ea', '#ffd700']
                });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    } else {
        btnResetLevel.innerText = isWin ? "Next Level" : "Try Again";
    }
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
