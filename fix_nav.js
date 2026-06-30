const fs = require('fs');

const files = ['about.html', 'index.html', 'project.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace index.html with about.html for About section
    content = content.replace(/href="index\.html"/g, 'href="about.html"');
    content = content.replace(/href="index\.html#experience"/g, 'href="about.html#experience"');
    content = content.replace(/href="index\.html#education"/g, 'href="about.html#education"');
    content = content.replace(/href="index\.html#skills"/g, 'href="about.html#skills"');
    
    // Replace projects.html with index.html for Projects section
    content = content.replace(/href="projects\.html"/g, 'href="index.html"');
    
    fs.writeFileSync(file, content);
});
console.log('Navigation links updated.');
