document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('constellationCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    
    const tooltip = document.getElementById('star-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipCategory = document.getElementById('tooltip-category');

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
                x: x,
                y: y,
                vx: 0,
                vy: 0,
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
            radius: Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05
        });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    let hoveredStar = null;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
        hoveredStar = null;
        tooltip.style.opacity = '0';
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('click', () => {
        if (hoveredStar) {
            window.location.href = `project.html?id=${hoveredStar.project.id}`;
        }
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Draw background stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        bgStars.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
            if (s.y < 0) s.y = height;
            if (s.y > height) s.y = 0;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Update main stars
        let currentHover = null;
        const time = Date.now() * 0.002;

        constellations.forEach(star => {
            // Stars are stationary as requested
            
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
            drawStarShape(ctx, star.x, star.y, 4, star.currentRadius * 1.5, star.currentRadius * 0.3);
            ctx.fill();
            
            ctx.shadowBlur = 0; // reset
            ctx.globalAlpha = 1.0; // reset
        });

        // Handle tooltip
        if (currentHover) {
            if (hoveredStar !== currentHover) {
                hoveredStar = currentHover;
                tooltipTitle.textContent = hoveredStar.project.title;
                tooltipCategory.textContent = hoveredStar.project.category;
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
