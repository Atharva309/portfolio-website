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

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    
    window.addEventListener('resize', resize);
    resize();

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

    function drawPlanet(ctx, x, y, radius) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 6); // tilt
        
        // Planet body
        let gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, 'rgba(75, 0, 130, 0.4)'); // Deep purple transparent
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ring
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 2.2, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(150, 140, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.restore();
    }

    const shootingStars = [];
    
    function spawnShootingStar() {
        if (Math.random() > 0.995 && shootingStars.length < 2 && !isWarping) {
            const x = Math.random() * width;
            const y = Math.random() * (height / 2);
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
    const numCategories = categoryNames.length;
    
    // Distribute centers
    // Distribute centers explicitly to avoid overlap
    categoryNames.forEach((cat, index) => {
        let centerX;
        if (index === 0) centerX = width * 0.25;
        else if (index === 1) centerX = width * 0.50;
        else centerX = width * 0.75;
        
        const centerY = height / 2 + (Math.random() * 100 - 50);
        
        categories[cat].forEach((project, pIndex) => {
            let placed = false;
            let x, y;
            let attempts = 0;
            
            while (!placed && attempts < 150) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 30 + Math.random() * 130;
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

    // Reset warp state if loaded from bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted || isWarping) {
            isWarping = false;
            warpSpeed = 0;
            document.body.style.pointerEvents = 'auto';
            constellations.forEach(star => {
                star.anchorX = star.originalAnchorX;
                star.anchorY = star.originalAnchorY;
            });
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
                // Reset state so that back button (bfcache) doesn't load a frozen screen
                isWarping = false;
                warpSpeed = 0;
                document.body.style.pointerEvents = 'auto';
                constellations.forEach(star => {
                    star.anchorX = star.originalAnchorX;
                    star.anchorY = star.originalAnchorY;
                });
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

        // Draw planet in the background
        drawPlanet(ctx, width * 0.8 + currentParallaxX * 2, height * 0.2 + currentParallaxY * 2, 100);

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
