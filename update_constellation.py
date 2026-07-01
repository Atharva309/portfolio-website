import re

with open('constellation.js', 'r') as f:
    content = f.read()

# 1. Tooltip variables
content = content.replace(
    "const tooltipCategory = document.getElementById('tooltip-category');",
    "const tooltipCategory = document.getElementById('tooltip-category');\n    const tooltipImage = document.getElementById('tooltip-image');\n    const tooltipDesc = document.getElementById('tooltip-desc');"
)

# 2. Parallax state
content = content.replace(
    "let mouseX = -1000;\n    let mouseY = -1000;\n    let hoveredStar = null;",
    """let mouseX = -1000;
    let mouseY = -1000;
    let hoveredStar = null;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let isWarping = false;
    let warpSpeed = 0;"""
)

# 3. Mouse move update parallax
content = content.replace(
    "mouseX = e.clientX - rect.left;\n        mouseY = e.clientY - rect.top;",
    """mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        targetParallaxX = (mouseX / width) * 2 - 1;
        targetParallaxY = (mouseY / height) * 2 - 1;"""
)

# 4. Mouse leave reset parallax
content = content.replace(
    "mouseY = -1000;\n        hoveredStar = null;",
    """mouseY = -1000;
        hoveredStar = null;
        targetParallaxX = 0;
        targetParallaxY = 0;"""
)

# 5. Click warp
content = content.replace(
    """    canvas.addEventListener('click', () => {
        if (hoveredStar) {
            window.location.href = `project.html?id=${hoveredStar.project.id}`;
        }
    });""",
    """    canvas.addEventListener('click', () => {
        if (hoveredStar && !isWarping) {
            isWarping = true;
            document.body.style.pointerEvents = 'none'; // disable clicks during warp
            tooltip.style.opacity = '0';
            setTimeout(() => {
                window.location.href = `project.html?id=${hoveredStar.project.id}`;
            }, 600);
        }
    });"""
)

# 6. Replace spaceObjects with shootingStars
content = re.sub(
    r"const spaceObjects = \[\];.*?function drawSpaceObjects\(ctx\) \{.*?\}\n        \}\n    \}",
    """const shootingStars = [];
    
    function spawnShootingStar() {
        if (Math.random() > 0.97 && shootingStars.length < 3 && !isWarping) {
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
    }""",
    content,
    flags=re.DOTALL
)

# 7. Update draw loop for parallax & shooting stars
content = content.replace(
    "spawnSpaceObject();\n        drawSpaceObjects(ctx);",
    "spawnShootingStar();\n        drawShootingStars(ctx);"
)

content = content.replace(
    "const time = timeMs * 0.002;",
    """const time = timeMs * 0.002;

        // Parallax smooth interpolation
        currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
        currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;

        if (isWarping) warpSpeed += 1.5;

        // Shift background image
        const bgSection = document.getElementById('constellation-section');
        if (bgSection && !isWarping) {
            bgSection.style.backgroundPosition = `calc(50% + ${currentParallaxX * 15}px) calc(50% + ${currentParallaxY * 15}px)`;
        }"""
)

# 8. Update drawPlanet for parallax
content = content.replace(
    "drawPlanet(ctx, width * 0.8, height * 0.2, 100);",
    "drawPlanet(ctx, width * 0.8 + currentParallaxX * 5, height * 0.2 + currentParallaxY * 5, 100);"
)

# 9. Update bgStars for parallax & warp
content = re.sub(
    r"bgStars.forEach\(s => \{.*?ctx\.fill\(\);\n        \}\);",
    """bgStars.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
            if (s.y < 0) s.y = height;
            if (s.y > height) s.y = 0;
            
            let drawX = s.x + currentParallaxX * 15;
            let drawY = s.y + currentParallaxY * 15;

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
        });""",
    content,
    flags=re.DOTALL
)

# 10. Update constellation stars for parallax & warp
content = re.sub(
    r"star\.x = star\.anchorX \+ Math\.sin.*?;\n            star\.y = star\.anchorY \+ Math\.cos.*?;",
    """let drawX = star.anchorX + Math.sin(timeMs * star.driftSpeedX + star.driftOffsetX) * star.driftRadius + currentParallaxX * 30;
            let drawY = star.anchorY + Math.cos(timeMs * star.driftSpeedY + star.driftOffsetY) * star.driftRadius + currentParallaxY * 30;
            
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
            star.y = drawY;""",
    content
)

# 11. Update rich tooltip population
content = content.replace(
    """tooltipTitle.textContent = hoveredStar.project.title;\n                tooltipCategory.textContent = hoveredStar.project.category;""",
    """tooltipTitle.textContent = hoveredStar.project.title;
                tooltipCategory.textContent = hoveredStar.project.category;
                if (tooltipDesc) tooltipDesc.innerHTML = hoveredStar.project.shortDescription;
                
                if (tooltipImage) {
                    if (hoveredStar.project.imageUrl) {
                        tooltipImage.src = hoveredStar.project.imageUrl;
                        tooltipImage.style.display = 'block';
                    } else {
                        tooltipImage.style.display = 'none';
                    }
                }"""
)

# 12. Fix the star flare rendering for warp
content = re.sub(
    r"drawStarShape\(ctx, star\.x, star\.y, 4, star\.currentRadius \* 1\.5, star\.currentRadius \* 0\.3\);\n            ctx\.fill\(\);",
    """if (isWarping) {
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
            }""",
    content
)

with open('constellation.js', 'w') as f:
    f.write(content)
