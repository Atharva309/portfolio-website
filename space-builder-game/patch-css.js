const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const oldCanvas = `#game-canvas {
    width: 100%;
    height: 100%;
}`;
const newCanvas = `#game-canvas {
    width: 100%;
    height: 100%;
    background-color: #0f172a;
}`;

css = css.replace(oldCanvas, newCanvas);
fs.writeFileSync('styles.css', css);
console.log('Canvas background added to styles.css');
