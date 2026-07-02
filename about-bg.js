document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('about-starfield');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const planet = document.getElementById('about-planet');
    
    let width, height;

    function resize() {
        // Make the canvas much larger than viewport to prevent edges showing during rotation
        width = window.innerWidth * 2;
        height = window.innerHeight * 2;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // Starfield Setup
    const stars = [];
    const numStars = 600; // More stars since canvas is 4x area
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.0 + 0.5,
            twinkleOffset: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.001 + Math.random() * 0.002
        });
    }

    let isScattering = false;
    let scatterOrigin = { x: 0, y: 0 };

    function drawStars() {
        ctx.clearRect(0, 0, width, height);
        const timeMs = Date.now();

        stars.forEach(s => {
            if (isScattering) {
                // Scatter away from origin
                const dx = s.x - scatterOrigin.x;
                const dy = s.y - scatterOrigin.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                // Initialize velocities if not present
                if (!s.vx) s.vx = 0;
                if (!s.vy) s.vy = 0;
                
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
                const twinkle = Math.sin(timeMs * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8 + 0.2})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        requestAnimationFrame(drawStars);
    }
    drawStars();

    // Scroll Rotation Logic
    window.addEventListener('scroll', () => {
        // Calculate scroll progress (0 to 1)
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFraction = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
        
        // Map scroll fraction to a rotation angle (e.g. 0 to 60 degrees)
        const rotationAngle = scrollFraction * 60; // Max rotation
        
        // Apply rotation to planet and canvas
        if (planet) {
            planet.style.transform = `rotate(${rotationAngle}deg)`;
        }
        if (canvas) {
            // Because canvas is huge and positioned at -50vh/-50vw, rotating around its center works perfectly
            canvas.style.transformOrigin = 'center center';
            canvas.style.transform = `rotate(${rotationAngle}deg)`;
        }
    });

    // Nebula Gateway Transition
    const projectsGateway = document.getElementById('about-nebula-gateway');
    if (projectsGateway) {
        projectsGateway.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Start scattering effect
            isScattering = true;
            const rect = projectsGateway.getBoundingClientRect();
            // Canvas is positioned -50vw/-50vh so the center is offset
            scatterOrigin = {
                x: rect.left + rect.width / 2 + window.innerWidth / 2,
                y: rect.top + rect.height / 2 + window.innerHeight / 2
            };

            document.body.classList.add('page-transitioning');
            setTimeout(() => {
                window.location.assign('projects.html');
            }, 800);
        });
    }

    // Reset state for bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
});
