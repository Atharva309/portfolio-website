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
        size: 150,
        isHovered: false
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
            
            if (astro.isHovered) {
                ctx.beginPath();
                ctx.arc(0, bobY, astro.size/2.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'cyan';
                ctx.fill();
            }

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
            astro.isHovered = true;
        } else {
            canvas.style.cursor = 'default';
            astro.isHovered = false;
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
                modal.style.animation = 'uiFadeIn 0.8s ease-out both';
                
                // Floating Close Button
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✖';
                closeBtn.style.position = 'absolute';
                closeBtn.style.top = '15px';
                closeBtn.style.right = '20px';
                closeBtn.style.background = 'rgba(0, 0, 0, 0.5)';
                closeBtn.style.color = '#fff';
                closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
                closeBtn.style.borderRadius = '50%';
                closeBtn.style.width = '40px';
                closeBtn.style.height = '40px';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.fontSize = '18px';
                closeBtn.style.zIndex = '10001'; // Above everything
                closeBtn.style.display = 'flex';
                closeBtn.style.alignItems = 'center';
                closeBtn.style.justifyContent = 'center';
                closeBtn.style.transition = 'background 0.2s, transform 0.2s';
                closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; closeBtn.style.transform = 'scale(1.1)'; };
                closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(0,0,0,0.5)'; closeBtn.style.transform = 'scale(1)'; };
                closeBtn.onclick = () => { modal.remove(); };
                
                // Welcome Screen
                const welcomeScreen = document.createElement('div');
                welcomeScreen.style.position = 'absolute';
                welcomeScreen.style.top = '0';
                welcomeScreen.style.left = '0';
                welcomeScreen.style.width = '100%';
                welcomeScreen.style.height = '100%';
                welcomeScreen.style.background = 'rgba(3, 2, 10, 0.95)';
                welcomeScreen.style.zIndex = '10000';
                welcomeScreen.style.display = 'flex';
                welcomeScreen.style.alignItems = 'center';
                welcomeScreen.style.justifyContent = 'center';
                welcomeScreen.style.flexDirection = 'column';
                welcomeScreen.style.color = '#fff';
                welcomeScreen.style.fontFamily = 'Outfit, sans-serif';
                welcomeScreen.style.textAlign = 'center';
                welcomeScreen.style.transition = 'opacity 0.8s ease';
                
                welcomeScreen.innerHTML = `
                    <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: #00ffff; text-shadow: 0 0 20px rgba(0,255,255,0.5);">Welcome to my Easter Egg!</h2>
                    <p style="font-size: 1.2rem; color: #ccc;">Build your ship and reach home safely!</p>
                `;
                
                const iframe = document.createElement('iframe');
                iframe.src = './space-builder-game/index.html';
                iframe.style.position = 'absolute';
                iframe.style.top = '0';
                iframe.style.left = '0';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.style.background = '#000';
                iframe.style.zIndex = '9999';
                
                modal.appendChild(iframe);
                modal.appendChild(welcomeScreen);
                modal.appendChild(closeBtn);
                document.body.appendChild(modal);
                
                // Fade out welcome screen after 3 seconds
                setTimeout(() => {
                    welcomeScreen.style.opacity = '0';
                    setTimeout(() => welcomeScreen.remove(), 800);
                }, 3000);
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
