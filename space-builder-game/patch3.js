const fs = require('fs');

let code = fs.readFileSync('game.js', 'utf8');

// Remove instructions references
code = code.replace("const instructions = document.getElementById('instructions');", 
                    "const introOverlay = document.getElementById('intro-overlay');\nconst levelIndicator = document.getElementById('level-indicator');");

code = code.replace(`instructions.innerText = "Level " + (currentLevel + 1) + "/5: Build your ship. Press PLAY to launch.";`, 
                    `levelIndicator.innerText = "Level " + (currentLevel + 1) + "/5";`);

code = code.replace(`instructions.innerText = "Use ARROW KEYS for directional thrusters! (Spacebar fires all)";`, "");

// Modify startDriveMode transition
const driveModeStart = `    state = 'DRIVE';
    btnPlay.innerText = 'STOP / BUILD';
    btnPlay.classList.remove('btn-primary');
    inventoryPanel.style.opacity = '0.5';
    inventoryPanel.style.pointerEvents = 'none';
    buildGridContainer.classList.add('hidden');
    canvas.classList.remove('hidden');
    
    // We must recalculate layout right before physics in case they resized the window
    initLayout(); 
    initPhysics();`;

const driveModeReplace = `    state = 'STARTING';
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
    }, 2000);`;

code = code.replace(driveModeStart, driveModeReplace);

// Modify beforeUpdate to handle STARTING state
code = code.replace(`    Events.on(engine, 'beforeUpdate', () => {
        if (state !== 'DRIVE') return;
        
        if (carBody) {`,
`    Events.on(engine, 'beforeUpdate', () => {
        if (state !== 'DRIVE' && state !== 'STARTING') return;
        
        if (carBody) {`);

code = code.replace(`            for (let planet of levelPlanets) {`,
`            if (state === 'DRIVE') {
                for (let planet of levelPlanets) {`);

// Close the if(state === 'DRIVE') block before Render.lookAt
code = code.replace(`            let minX = Math.min(level.startPos.x, level.goal.x);`,
`            }
            
            let minX = Math.min(level.startPos.x, level.goal.x);`);

code = code.replace(`        if (carBody) {
            for (let t of thrusterOffsets) {
                if (activeThrusters[t.dir]) {`,
`        if (state === 'DRIVE' && carBody) {
            for (let t of thrusterOffsets) {
                if (activeThrusters[t.dir]) {`);

fs.writeFileSync('game.js', code);
console.log("Patched successfully!");
