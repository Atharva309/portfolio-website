const fs = require('fs');

let code = fs.readFileSync('game.js', 'utf8');

// 1. Goal sensor invisibility
code = code.replace(`goalSensor = Bodies.circle(level.goal.x, level.goal.y, level.goal.radius, {
        isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 240, 255, 0.3)' }, label: 'goal'
    });`,
`goalSensor = Bodies.circle(level.goal.x, level.goal.y, level.goal.radius, {
        isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 0, 0, 0)' }, label: 'goal'
    });`);

// 2. Add lasers and rockets definitions BEFORE Composite.add(engine.world, bodiesToRender);
const defSetup = `    let rockets = [];
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
    
    Composite.add(engine.world, bodiesToRender);`;
code = code.replace('    Composite.add(engine.world, bodiesToRender);', defSetup);

// 3. Add behavior to beforeUpdate
const beforeUpdateOld = `        if (carBody) {
            if (state === 'DRIVE') {
                for (let planet of levelPlanets) {`;
const beforeUpdateNew = `        if (carBody) {
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

                for (let planet of levelPlanets) {`;
code = code.replace(beforeUpdateOld, beforeUpdateNew);

// 4. Custom render in afterRender
const renderWormhole = `    Events.on(render, 'afterRender', () => {
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

        if (state === 'DRIVE' && carBody) {`;
code = code.replace(`    Events.on(render, 'afterRender', () => {
        if (state === 'DRIVE' && carBody) {`, renderWormhole);

// 5. Collision start for lasers and rockets
const collisionCheck = `    Events.on(engine, 'collisionStart', (event) => {
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

            if (bodyA === goalSensor || bodyB === goalSensor) {`;
code = code.replace(`    Events.on(engine, 'collisionStart', (event) => {
        for (let pair of event.pairs) {
            const { bodyA, bodyB } = pair;
            
            if (bodyA === goalSensor || bodyB === goalSensor) {`, collisionCheck);


fs.writeFileSync('game.js', code);
console.log('Defenses injected.');
