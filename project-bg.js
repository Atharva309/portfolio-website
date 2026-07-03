document.addEventListener('DOMContentLoaded', () => {
    // Parse URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const themeIndex = parseInt(urlParams.get('theme')) || 0;
    const bgType = urlParams.get('bg') || 'planet';

    // Apply Dynamic Theme Colors
    const themeColors = [
        { primary: '#b48cff', secondary: '#6c63ff', rgb: '180, 140, 255' }, // AI/ML Theme
        { primary: '#64b4ff', secondary: '#00f2fe', rgb: '100, 180, 255' }, // Data Theme
        { primary: '#ff6482', secondary: '#ff4500', rgb: '255, 100, 130' }  // Cloud Theme
    ];

    const currentTheme = themeColors[themeIndex % themeColors.length];
    
    // Override CSS Variables for this page
    document.documentElement.style.setProperty('--primary', currentTheme.primary);
    document.documentElement.style.setProperty('--secondary', currentTheme.secondary);
    
    // Update category badge styling specifically if it uses the theme color
    const styleSheet = document.createElement('style');
    styleSheet.innerText = `
        .detail-category {
            background: rgba(${currentTheme.rgb}, 0.15) !important;
            border: 1px solid rgba(${currentTheme.rgb}, 0.3) !important;
            color: ${currentTheme.primary} !important;
        }
        .btn-primary {
            background: ${currentTheme.primary} !important;
            box-shadow: 0 4px 15px rgba(${currentTheme.rgb}, 0.4) !important;
        }
        .highlight {
            color: ${currentTheme.primary} !important;
            text-shadow: 0 0 10px rgba(${currentTheme.rgb}, 0.5) !important;
        }
    `;
    document.head.appendChild(styleSheet);

    // Canvas Background Rendering
    const canvas = document.getElementById('project-bg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });

    // Replicate graphics functions from constellation.js for standalone background
    function drawPlanet(ctx, x, y, radius, typeIndex = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 6); // tilt
        
        const colors = [
            ['rgba(75, 0, 130, 0.4)', 'rgba(150, 140, 255, 0.2)'], // Deep purple
            ['rgba(0, 80, 180, 0.4)', 'rgba(100, 180, 255, 0.2)'], // Deep blue
            ['rgba(180, 50, 80, 0.4)', 'rgba(255, 100, 130, 0.2)'] // Crimson
        ];
        const color = colors[typeIndex % colors.length];

        // Planet body
        let gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, color[0]); 
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ring
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 2.2, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color[1];
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.restore();
    }

    function drawSpaceship(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4); // Fly diagonally up-right
        
        // Ship Body
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size/3, size/2);
        ctx.lineTo(-size/3, size/2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200, 220, 255, 0.2)'; 
        ctx.fill();
        
        // Cockpit window
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/6, 0);
        ctx.lineTo(-size/6, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.fill();
        
        // Engine Glow
        ctx.beginPath();
        ctx.moveTo(-size/4, size/2);
        ctx.lineTo(size/4, size/2);
        ctx.lineTo(0, size);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'cyan';
        ctx.fill();
        
        ctx.restore();
    }

    function drawNebulaCloud(ctx, x, y, radius, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.1); 
        
        const puffCenters = [
            { dx: 0, dy: 0, r: radius * 1.5, color: 'rgba(255, 69, 0, 0.3)' },
            { dx: -radius*0.6, dy: -radius*0.3, r: radius * 1.2, color: 'rgba(255, 100, 0, 0.25)' },
            { dx: radius*0.7, dy: radius*0.2, r: radius * 1.3, color: 'rgba(200, 50, 0, 0.25)' },
            { dx: -radius*0.2, dy: radius*0.6, r: radius, color: 'rgba(255, 140, 0, 0.2)' },
            { dx: radius*0.4, dy: -radius*0.7, r: radius, color: 'rgba(150, 0, 50, 0.25)' }
        ];
        
        puffCenters.forEach(puff => {
            let gradient = ctx.createRadialGradient(puff.dx, puff.dy, 0, puff.dx, puff.dy, puff.r);
            gradient.addColorStop(0, puff.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.beginPath();
            ctx.arc(puff.dx, puff.dy, puff.r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        });
        
        ctx.restore();
    }

    // Animation Loop
    let bgStars = [];
    for(let i=0; i<100; i++) {
        bgStars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            z: Math.random() * 6 + 2,
            radius: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const time = Date.now() * 0.001;

        // Draw ambient stars
        bgStars.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
            if (s.y < 0) s.y = height;
            if (s.y > height) s.y = 0;
            
            const twinkle = (Math.sin(time * 2 + s.twinkleOffset) + 1) * 0.5 * 0.5 + 0.2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
            ctx.fill();
        });

        // Slow animated float for background element
        const floatX = Math.sin(time * 0.5) * 50;
        const floatY = Math.cos(time * 0.3) * 30;
        const objX = width * 0.8 + floatX;
        const objY = height * 0.3 + floatY; // Top right area

        if (bgType === 'spaceship') {
            drawSpaceship(ctx, objX, objY, 150); // Scale up a bit
        } else if (bgType === 'nebula') {
            drawNebulaCloud(ctx, objX, objY, 200, time);
        } else {
            drawPlanet(ctx, objX, objY, 180, themeIndex);
        }

        requestAnimationFrame(draw);
    }
    draw();
});
