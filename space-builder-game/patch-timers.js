const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldLogic = `            if (state === 'DRIVE') {
                // Lasers logic
                for (let laser of lasers) {`;

const newLogic = `            // Lasers logic (Update timers during STARTING too so they blink correctly)
            if (state === 'DRIVE' || state === 'STARTING') {
                for (let laser of lasers) {`;

code = code.replace(oldLogic, newLogic);

// Ensure rockets only spawn and home in DRIVE
const oldRocketSpawn = `                // Rockets Spawning`;
const newRocketSpawn = `            }
            if (state === 'DRIVE') {
                // Rockets Spawning`;
code = code.replace(oldRocketSpawn, newRocketSpawn);

fs.writeFileSync('game.js', code);
console.log('Laser timers patched');
