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

    // Astronaut Setup
    const astroImg = new Image();
    astroImg.src = 'assets/astronaut.png';
    let astro = {
        x: -200,
        y: height + 200,
        vx: 0.3 + Math.random() * 0.3,
        vy: -0.3 - Math.random() * 0.3,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.005,
        size: 150
    };

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

        // Draw Astronaut
        if (astroImg.complete) {
            astro.x += astro.vx;
            astro.y += astro.vy;
            astro.rot += astro.rotSpeed;

            // Reset when off-screen top right
            if (astro.x > width + 200 || astro.y < -200) {
                astro.x = -200 - Math.random() * 200; // start a bit further left randomly
                astro.y = height + 200 + Math.random() * 200; // start a bit further down randomly
                astro.vx = 0.3 + Math.random() * 0.3;
                astro.vy = -0.3 - Math.random() * 0.3;
                astro.rotSpeed = (Math.random() - 0.5) * 0.005;
                astro.size = 120 + Math.random() * 60;
            }

            ctx.save();
            // Removed 'screen' composite operation to support proper transparent PNGs
            ctx.globalAlpha = 0.65; // Make the astronaut slightly dimmer
            ctx.translate(astro.x, astro.y);
            ctx.rotate(astro.rot);
            // Floating bobbing effect
            const bobY = Math.sin(timeMs * 0.001) * 10;
            ctx.drawImage(astroImg, -astro.size/2, -astro.size/2 + bobY, astro.size, astro.size);
            ctx.restore();
        }

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

    // Clickable Astronaut Logic
    canvas.addEventListener('mousemove', (e) => {
        if (!astroImg.complete) return;
        const dx = e.clientX - astro.x;
        const dy = e.clientY - astro.y;
        if (Math.sqrt(dx*dx + dy*dy) < astro.size / 2) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('click', (e) => {
        if (!astroImg.complete) return;
        const dx = e.clientX - astro.x;
        const dy = e.clientY - astro.y;
        if (Math.sqrt(dx*dx + dy*dy) < astro.size / 2) {
            if (!document.getElementById('game-modal')) {
                const modal = document.createElement('div');
                modal.id = 'game-modal';
                modal.style.position = 'fixed';
                modal.style.top = '10vh';
                modal.style.left = '10vw';
                modal.style.width = '80vw';
                modal.style.height = '80vh';
                modal.style.backgroundColor = '#03020A';
                modal.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                modal.style.borderRadius = '16px';
                modal.style.boxShadow = '0 20px 60px rgba(0, 255, 255, 0.2)';
                modal.style.zIndex = '9999';
                modal.style.display = 'flex';
                modal.style.flexDirection = 'column';
                modal.style.overflow = 'hidden';
                modal.style.animation = 'uiFadeIn 0.3s ease-out both';
                
                const header = document.createElement('div');
                header.style.padding = '10px 20px';
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.style.background = 'rgba(0, 0, 0, 0.8)';
                header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                
                const title = document.createElement('div');
                title.innerText = '🚀 Space Builder';
                title.style.color = '#fff';
                title.style.fontFamily = 'Outfit, sans-serif';
                title.style.fontWeight = 'bold';
                title.style.letterSpacing = '1px';

                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✖ Close';
                closeBtn.style.background = 'transparent';
                closeBtn.style.color = '#fff';
                closeBtn.style.border = 'none';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.fontSize = '14px';
                closeBtn.style.opacity = '0.7';
                closeBtn.style.transition = 'opacity 0.2s';
                closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
                closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
                closeBtn.onclick = () => { modal.remove(); };
                
                const iframe = document.createElement('iframe');
                iframe.src = './space-builder-game/index.html';
                iframe.style.flex = '1';
                iframe.style.border = 'none';
                iframe.style.width = '100%';
                iframe.style.background = '#000';
                
                header.appendChild(title);
                header.appendChild(closeBtn);
                modal.appendChild(header);
                modal.appendChild(iframe);
                document.body.appendChild(modal);
            }
        }
    });

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
        }, 800);
    });

    // Reset state for bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
});
