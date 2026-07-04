const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldPhysics = `    for (let p of level.planets) {
        const planetBody = Bodies.circle(p.x, p.y, p.radius, {
            isStatic: true,
            render: { fillStyle: p.color },
            label: 'planet'
        });
        planetBody.gravityMass = p.mass;
        levelPlanets.push(planetBody);
        bodiesToRender.push(planetBody);
    }`;

const newPhysics = `    for (let p of level.planets) {
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
    }`;

code = code.replace(oldPhysics, newPhysics);
fs.writeFileSync('game.js', code);
console.log('initPhysics patched');
