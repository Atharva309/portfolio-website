const fs = require('fs');

let game = fs.readFileSync('game.js', 'utf8');

const anchor = `let engine, render, runner;`;
const insert = `
// Pre-render Earth emoji to avoid macOS scaling bug
const earthCanvas = document.createElement('canvas');
earthCanvas.width = 300;
earthCanvas.height = 300;
const eCtx = earthCanvas.getContext('2d');
eCtx.font = "200px sans-serif";
eCtx.textAlign = 'center';
eCtx.textBaseline = 'middle';
eCtx.fillText('🌍', 150, 160);

let engine, render, runner;`;

if (!game.includes('earthCanvas.width = 300;')) {
    game = game.replace(anchor, insert);
    fs.writeFileSync('game.js', game);
    console.log("Injected earthCanvas properly.");
} else {
    console.log("Already injected.");
}
