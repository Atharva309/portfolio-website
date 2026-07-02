document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('constellationCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    
    const tooltip = document.getElementById('star-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipCategory = document.getElementById('tooltip-category');
    const tooltipImage = document.getElementById('tooltip-image');
    const tooltipDesc = document.getElementById('tooltip-desc');

    let numCategories = 1; // Will be updated when data is parsed

    function resize() {
        width = window.innerWidth;
        // Make canvas height scale with number of categories + some padding
        height = window.innerHeight * (numCategories + 0.8);
        canvas.width = width;
        canvas.height = height;
        
        // Also ensure the section stretches to fit canvas height
        const section = document.getElementById('constellation-section');
        if (section) section.style.minHeight = `${height}px`;
    }
    
    // Defer initial resize until data is parsed
    window.constellationFilter = 'all';

    function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

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
        
        // Ship Body (triangular/sleek)
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size/3, size/2);
        ctx.lineTo(-size/3, size/2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.fill();
        
        // Cockpit window
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/6, 0);
        ctx.lineTo(-size/6, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.fill();
        
        // Engine Glow (Thruster)
        ctx.beginPath();
        ctx.moveTo(-size/4, size/2);
        ctx.lineTo(size/4, size/2);
        ctx.lineTo(0, size * 1.5);
        ctx.closePath();
        let glow = ctx.createLinearGradient(0, size/2, 0, size * 1.5);
        glow.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        glow.addColorStop(1, 'rgba(0, 0, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fill();
        
        // Wings
        ctx.beginPath();
        ctx.moveTo(size/3, size/4);
        ctx.lineTo(size/1.5, size/2);
        ctx.lineTo(size/3, size/2);
        ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-size/3, size/4);
        ctx.lineTo(-size/1.5, size/2);
        ctx.lineTo(-size/3, size/2);
        ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
        ctx.fill();
        
        ctx.restore();
    }

    const shootingStars = [];
    
    function spawnShootingStar() {
        if (Math.random() > 0.95 && shootingStars.length < 8 && !isWarping) {
            const x = Math.random() * width;
            const y = Math.random() * height; // Spawn anywhere across the full height
            const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2; // Diagonal down-right
            const speed = 15 + Math.random() * 10;
            const length = 50 + Math.random() * 100;
            shootingStars.push({ x, y, angle, speed, length, opacity: 1.0 });
        }
    }

    function drawShootingStars(ctx) {
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const star = shootingStars[i];
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.opacity -= 0.015;

            if (star.opacity <= 0 || star.x > width + 200 || star.y > height + 200) {
                shootingStars.splice(i, 1);
                continue;
            }

            const tailX = star.x - Math.cos(star.angle) * star.length;
            const tailY = star.y - Math.sin(star.angle) * star.length;

            const grad = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Data parsing
    const categories = {};
    if (typeof projectsData !== 'undefined') {
        projectsData.forEach(p => {
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push(p);
        });
    }

    const constellations = [];
    const categoryNames = Object.keys(categories);
    numCategories = Math.max(1, categoryNames.length);
    
    // Now that numCategories is known, we can resize the canvas
    resize();
    window.addEventListener('resize', resize);

    // Distribute centers vertically
    categoryNames.forEach((cat, index) => {
        const centerX = width / 2;
        const centerY = (index + 0.9) * window.innerHeight; // Pushed further down
        
        // Inject HTML Title for this category
        const section = document.getElementById('constellation-section');
        if (section) {
            const titleEl = document.createElement('h3');
            titleEl.textContent = cat;
            titleEl.style.position = 'absolute';
            titleEl.style.top = `${(index + 0.9) * window.innerHeight - 350}px`; // Extra clearance for the large 260px radius
            titleEl.style.left = '50%';
            titleEl.style.transform = 'translateX(-50%)';
            titleEl.style.fontSize = '2.5rem';
            titleEl.style.color = 'var(--primary)';
            titleEl.style.textShadow = '0 0 15px rgba(108, 99, 255, 0.5)';
            titleEl.style.pointerEvents = 'none';
            titleEl.style.zIndex = '10';
            section.appendChild(titleEl);
        }
        
        categories[cat].forEach((project, pIndex) => {
            let placed = false;
            let x, y;
            let attempts = 0;
            
            while (!placed && attempts < 150) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 60 + Math.random() * 200; // Increased constellation size
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                
                // Ensure stars aren't too close to each other
                let tooClose = false;
                for (let i = 0; i < constellations.length; i++) {
                    const other = constellations[i];
                    const dist = Math.sqrt(Math.pow(x - other.x, 2) + Math.pow(y - other.y, 2));
                    if (dist < 45) { // Minimum 45px distance between any two stars
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    placed = true;
                }
                attempts++;
            }
            
            constellations.push({
                originalAnchorX: x,
                originalAnchorY: y,
                anchorX: x,
                anchorY: y,
                x: x,
                y: y,
                vx: 0,
                vy: 0,
                driftOffsetX: Math.random() * Math.PI * 2,
                driftOffsetY: Math.random() * Math.PI * 2,
                driftSpeedX: 0.0003 + Math.random() * 0.0004,
                driftSpeedY: 0.0003 + Math.random() * 0.0004,
                driftRadius: 15 + Math.random() * 20, // Drift within 15-35px radius
                twinkleOffset: Math.random() * Math.PI * 2,
                baseRadius: 10 + Math.random() * 6,
                currentRadius: 10,
                project: project,
                category: cat
            });
        });
    });

    // Background stars
    const bgStars = [];
    for(let i=0; i<150; i++) {
        bgStars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    let hoveredStar = null;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let isWarping = false;
    let warpSpeed = 0;

    // Force reload if loaded from bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        targetParallaxX = (mouseX / width) * 2 - 1;
        targetParallaxY = (mouseY / height) * 2 - 1;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
        hoveredStar = null;
        targetParallaxX = 0;
        targetParallaxY = 0;
        tooltip.style.opacity = '0';
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('click', () => {
        if (hoveredStar && !isWarping) {
            isWarping = true;
            document.body.style.pointerEvents = 'none'; // disable clicks during warp
            tooltip.style.opacity = '0';
            const targetUrl = `project.html?id=${hoveredStar.project.id}`;
            setTimeout(() => {
                window.location.assign(targetUrl);
            }, 600);
        }
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const timeMs = Date.now();
        const time = timeMs * 0.002;

        // Parallax smooth interpolation
        currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
        currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;

        if (isWarping) warpSpeed += 1.5;

        // Shift background image (reduced parallax)
        const bgSection = document.getElementById('constellation-section');
        if (bgSection && !isWarping) {
            bgSection.style.backgroundPosition = `calc(50% + ${currentParallaxX * 5}px) calc(50% + ${currentParallaxY * 5}px)`;
        }

        // Draw planet or spaceship in the background for each section
        for (let i = 0; i < numCategories; i++) {
            const planetY = (i + 0.8) * window.innerHeight + currentParallaxY * 2;
            const planetX = (i % 2 === 0 ? width * 0.8 : width * 0.2) + currentParallaxX * 2;
            
            if (i === 1) {
                drawSpaceship(ctx, planetX, planetY, 80);
            } else {
                drawPlanet(ctx, planetX, planetY, 120 + (i * 20), i); // Varying sizes and colors
            }
        }

        // Draw background stars with shimmer
        bgStars.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
            if (s.y < 0) s.y = height;
            if (s.y > height) s.y = 0;
            
            let drawX = s.x + currentParallaxX * 8;
            let drawY = s.y + currentParallaxY * 8;

            if (isWarping) {
                const dx = drawX - width/2;
                const dy = drawY - height/2;
                const angle = Math.atan2(dy, dx);
                s.x += Math.cos(angle) * warpSpeed;
                s.y += Math.sin(angle) * warpSpeed;
                drawX = s.x;
                drawY = s.y;
                
                ctx.beginPath();
                ctx.moveTo(drawX, drawY);
                ctx.lineTo(drawX - Math.cos(angle) * warpSpeed * 2, drawY - Math.sin(angle) * warpSpeed * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.lineWidth = s.radius;
                ctx.stroke();
            } else {
                const twinkle = Math.sin(time + s.twinkleOffset) * 0.5 + 0.5; // 0.0 to 1.0
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`; // Max opacity 0.8
                ctx.beginPath();
                ctx.arc(drawX, drawY, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Spawn and draw space objects
        spawnShootingStar();
        drawShootingStars(ctx);

        // Update main stars
        let currentHover = null;

        constellations.forEach(star => {
            // Organic drifting logic
            let drawX = star.anchorX + Math.sin(timeMs * star.driftSpeedX + star.driftOffsetX) * star.driftRadius + currentParallaxX * 12;
            let drawY = star.anchorY + Math.cos(timeMs * star.driftSpeedY + star.driftOffsetY) * star.driftRadius + currentParallaxY * 12;
            
            if (isWarping) {
                const dx = drawX - width/2;
                const dy = drawY - height/2;
                const angle = Math.atan2(dy, dx);
                star.anchorX += Math.cos(angle) * warpSpeed * 0.6;
                star.anchorY += Math.sin(angle) * warpSpeed * 0.6;
                drawX = star.anchorX;
                drawY = star.anchorY;
            }
            
            star.x = drawX;
            star.y = drawY;
            
            // Check hover
            const dx = mouseX - star.x;
            const dy = mouseY - star.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 30) {
                currentHover = star;
                star.currentRadius = star.baseRadius * 1.5;
            } else {
                star.currentRadius = star.baseRadius;
            }
        });

        // Draw connecting lines for same categories
        ctx.lineWidth = 2;
        const activeFilter = window.constellationFilter || 'all';

        for (let i = 0; i < constellations.length; i++) {
            for (let j = i + 1; j < constellations.length; j++) {
                if (constellations[i].category === constellations[j].category) {
                    const category = constellations[i].category;
                    
                    // Dim if filtered out
                    if (activeFilter !== 'all' && category !== activeFilter) continue;

                    const dx = constellations[i].x - constellations[j].x;
                    const dy = constellations[i].y - constellations[j].y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Logarithmic-style fade: drops quickly but never goes completely to 0 (minimum 0.03)
                    let alpha = Math.max(0.03, 0.6 - (dist / 400));
                    
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    if (category === 'AI/ML') ctx.strokeStyle = `rgba(150, 140, 255, ${alpha + 0.1})`;
                    if (category === 'Data Analytics') ctx.strokeStyle = `rgba(0, 255, 255, ${alpha + 0.1})`;
                    
                    ctx.beginPath();
                    ctx.moveTo(constellations[i].x, constellations[i].y);
                    ctx.lineTo(constellations[j].x, constellations[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw stars
        constellations.forEach(star => {
            // Dim if filtered out
            const isDimmed = activeFilter !== 'all' && star.category !== activeFilter;
            
            // Subtle twinkle effect
            const twinkle = Math.sin(time + star.twinkleOffset) * 0.3 + 0.7; // oscillates between 0.4 and 1.0
            ctx.globalAlpha = isDimmed ? 0.1 : twinkle;
            
            if (star.category === 'AI/ML') {
                ctx.fillStyle = '#968CFF'; // Brighter purple
                ctx.shadowColor = '#968CFF';
            } else if (star.category === 'Data Analytics') {
                ctx.fillStyle = '#00FFFF';
                ctx.shadowColor = '#00FFFF';
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = '#FFFFFF';
            }
            
            ctx.shadowBlur = isDimmed ? 0 : 25;
            
            // Draw 4-point star flare
            if (isWarping) {
                const dx = star.x - width/2;
                const dy = star.y - height/2;
                const angle = Math.atan2(dy, dx);
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(star.x - Math.cos(angle) * warpSpeed * 1.5, star.y - Math.sin(angle) * warpSpeed * 1.5);
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = star.currentRadius;
                ctx.stroke();
            } else {
                drawStarShape(ctx, star.x, star.y, 4, star.currentRadius * 1.5, star.currentRadius * 0.3);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0; // reset
            ctx.globalAlpha = 1.0; // reset
        });

        // Handle tooltip
        if (currentHover) {
            if (hoveredStar !== currentHover) {
                hoveredStar = currentHover;
                tooltipTitle.textContent = hoveredStar.project.title;
                tooltipCategory.textContent = hoveredStar.project.category;
                if (tooltipDesc) tooltipDesc.innerHTML = hoveredStar.project.shortDescription;
                
                if (tooltipImage) {
                    if (hoveredStar.project.imageUrl) {
                        tooltipImage.src = hoveredStar.project.imageUrl;
                        tooltipImage.style.display = 'block';
                    } else {
                        tooltipImage.style.display = 'none';
                    }
                }
                tooltip.style.opacity = '1';
                canvas.style.cursor = 'pointer';
            }
            // Move tooltip smoothly to star
            tooltip.style.left = hoveredStar.x + 'px';
            tooltip.style.top = hoveredStar.y + 'px';
        } else {
            if (hoveredStar) {
                hoveredStar = null;
                tooltip.style.opacity = '0';
                canvas.style.cursor = 'crosshair';
            }
        }

        requestAnimationFrame(draw);
    }

    draw();
});
