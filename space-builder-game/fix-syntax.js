const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const brokenCode = `                    ctx.fillRect(x - r, by, r * 2, bh);
                }

            ctx.restore();`;

const fixedCode = `                    ctx.fillRect(x - r, by, r * 2, bh);
                }
            } // Added missing closing brace

            ctx.restore();`;

code = code.replace(brokenCode, fixedCode);
fs.writeFileSync('game.js', code);
console.log('Syntax error fixed');
