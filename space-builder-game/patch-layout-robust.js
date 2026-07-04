const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const oldInitLayout = `function initLayout() {
    const rect = workspace.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Fit grid inside workspace with some padding (leave 100px width for sidebar tools)
    const maxW = rect.width - 100;
    const maxH = rect.height - 40;
    CELL_SIZE = Math.floor(Math.min(maxW / GRID_COLS, maxH / GRID_ROWS));
    
    const gridWidth = CELL_SIZE * GRID_COLS;
    const gridHeight = CELL_SIZE * GRID_ROWS;`;
    
const newInitLayout = `function initLayout() {
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
    const gridHeight = CELL_SIZE * GRID_ROWS;`;

code = code.replace(oldInitLayout, newInitLayout);

// Also let's make absolutely sure initDOMGrid isn't missing.
// It's called once at the end. That's fine.

fs.writeFileSync('game.js', code);
console.log('Layout patched for robust bounds');
