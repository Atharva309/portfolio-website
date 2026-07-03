document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // Starfield Setup
    const stars = [];
    const numStars = 300;
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5 + 0.2,
            twinkleOffset: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.001 + Math.random() * 0.002,
            vx: 0,
            vy: 0
        });
    }

    let isScattering = false;
    let scatterOrigin = { x: 0, y: 0 };

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const timeMs = Date.now();

        stars.forEach(s => {
            if (isScattering) {
                // Scatter away from origin
                const dx = s.x - scatterOrigin.x;
                const dy = s.y - scatterOrigin.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                // Acceleration outward
                s.vx += (dx / dist) * 0.5;
                s.vy += (dy / dist) * 0.5;
                
                s.x += s.vx;
                s.y += s.vy;
                
                // Draw streak
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.lineWidth = s.radius;
                ctx.stroke();
            } else {
                // Normal twinkle
                const twinkle = Math.sin(timeMs * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.7})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        requestAnimationFrame(draw);
    }
    draw();

    // Planet rotation animation
    const planet = document.querySelector('.planet');
    let rotation = 0;
    function rotatePlanet() {
        rotation += 0.02;
        if (planet) planet.style.transform = `rotate(${rotation}deg)`;
        requestAnimationFrame(rotatePlanet);
    }
    rotatePlanet();

    // Handle Transitions
    const body = document.body;
    const aboutGateway = document.getElementById('planet-gateway');
    const projectsGateway = document.getElementById('nebula-gateway');

    aboutGateway.addEventListener('click', (e) => {
        e.preventDefault();
        body.classList.add('page-transitioning', 'to-about');
        setTimeout(() => {
            window.location.assign('about.html');
        }, 1000);
    });

    projectsGateway.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Start scattering effect
        isScattering = true;
        const rect = projectsGateway.getBoundingClientRect();
        scatterOrigin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        body.classList.add('page-transitioning', 'to-projects');
        setTimeout(() => {
            window.location.assign('projects.html');
        }, 1100); // Synced with the 1s CSS transform animation
    });

    // Reset state for bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
});
