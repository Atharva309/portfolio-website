const fs = require('fs');

const files = ['about.html', 'index.html', 'project.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix remaining index.html references that should point to about
    content = content.replace(/href="index\.html#about"/g, 'href="about.html"');
    content = content.replace(/href="index\.html#contact"/g, 'href="about.html#contact"');
    
    fs.writeFileSync(file, content);
});
console.log('Fixed remaining links.');
