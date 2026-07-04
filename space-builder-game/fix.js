const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// The file is messed up at the top. Let's find the second // Elements
let firstElements = code.indexOf('// Elements');
let secondElements = code.indexOf('// Elements', firstElements + 1);

if (secondElements !== -1) {
    // The top part is duplicated garbage
    code = code.substring(secondElements);
}

// But wait, the top part contained the ONLY definition of `levels` if I overwrote the second one.
// Let's just output the file contents so I can see what is really happening.
console.log(code.substring(0, 1000));
