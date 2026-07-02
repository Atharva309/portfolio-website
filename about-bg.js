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
            radius: Math.random() * 1.5 + 0.2,
            twinkleOffset: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.001 + Math.random() * 0.002
        });
    }

    function drawStars() {
        ctx.clearRect(0, 0, width, height);
        const timeMs = Date.now();

        stars.forEach(s => {
            const twinkle = Math.sin(timeMs * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.7})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
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
});
