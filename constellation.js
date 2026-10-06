document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('constellationCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    
    const tooltip = document.getElementById('star-tooltip');

    let numCategories = 1; // Will be updated when data is parsed

    // Small constellations: star spread and star size relative to the original full-size ones
    const starScale = window.innerWidth >= 1000 ? 0.35 : 0.3;
    const starSize = 0.6;
    const starHitRadius = 30 * starSize;
    const miniR = (260 + 35) * starScale + 5; // Furthest a star reaches from its constellation center
    let sectionHeight = 0; // Set by layoutSections()
    let layoutBottom = 0;

    function resize() {
        width = window.innerWidth;
        const isMobile = width <= 768;
        const topPadding = isMobile ? 1.5 : 1.2;
        // Make canvas height scale exactly to fit the last constellation, without massive empty space
        const sectionH = sectionHeight || window.innerHeight;
        height = Math.max(window.innerHeight * (topPadding + 0.6) + (numCategories - 1) * sectionH, layoutBottom);
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

    function drawNebulaCloud(ctx, x, y, radius, time) {
        ctx.save();
        ctx.translate(x, y);
        
        // Slow rotation for a swirling gas effect
        ctx.rotate(time * 0.1); 
        
        // A space cloud (nebula) is drawn using multiple overlapping radial gradients
        const puffCenters = [
            { dx: 0, dy: 0, r: radius * 1.5, color: 'rgba(255, 69, 0, 0.3)' }, // Red-orange center
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
        ctx.fillStyle = 'rgba(200, 220, 255, 0.2)'; // Made much duller
        ctx.fill();
        
        // Cockpit window
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/6, 0);
        ctx.lineTo(-size/6, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.fill();
        
        // Engine Glow (Thruster)
        ctx.beginPath();
        ctx.moveTo(-size/4, size/2);
        ctx.lineTo(size/4, size/2);
        ctx.lineTo(0, size * 1.5);
        ctx.closePath();
        let glow = ctx.createLinearGradient(0, size/2, 0, size * 1.5);
        glow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
        glow.addColorStop(1, 'rgba(0, 0, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fill();
        
        // Wings
        ctx.beginPath();
        ctx.moveTo(size/3, size/4);
        ctx.lineTo(size/1.5, size/2);
        ctx.lineTo(size/3, size/2);
        ctx.fillStyle = 'rgba(150, 180, 255, 0.15)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-size/3, size/4);
        ctx.lineTo(-size/1.5, size/2);
        ctx.lineTo(-size/3, size/2);
        ctx.fillStyle = 'rgba(150, 180, 255, 0.15)';
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
    const isMobileLayout = window.innerWidth <= 768;
    const spacingCoef = isMobileLayout ? 1.5 : 1.2;
    const titleOffset = isMobileLayout ? 250 : 350;

    // Each section: project list, with a small constellation on its right (above it on narrow screens)
    const sideBySide = window.innerWidth >= 1000;
    const listWidth = window.innerWidth >= 1280 ? 480 : (sideBySide ? 380 : Math.min(560, window.innerWidth - 32));
    const listThemes = ['180, 140, 255', '0, 255, 255', '255, 69, 0']; // Match star colors
    const sectionLayouts = [];
    let listHoverStar = null;
    let activeListItem = null;
    let threadProgress = 0;
    let threadStar = null;

    const section = document.getElementById('constellation-section');

    categoryNames.forEach((cat, index) => {
        let titleEl = null;

        // Inject HTML Title for this category
        if (section) {
            if (index === 0) {
                // Inject the main title block above the first constellation
                const mainTitle = document.createElement('div');
                mainTitle.style.position = 'absolute';
                mainTitle.style.top = isMobileLayout ? `${window.innerHeight * 0.35}px` : `${window.innerHeight * 0.25}px`; // Centered in the top gap
                mainTitle.style.left = '50%';
                mainTitle.style.transform = 'translateX(-50%)';
                mainTitle.style.textAlign = 'center';
                mainTitle.style.pointerEvents = 'none';
                mainTitle.style.zIndex = '10';
                mainTitle.style.width = '100%';
                mainTitle.style.animation = 'uiFadeInCenter 1.2s ease-out 0.6s both'; // Fades in slowly while keeping -50% translateX
                mainTitle.innerHTML = `
                    <h2 style="font-family: 'Outfit', sans-serif; font-size: ${isMobileLayout ? '2.5rem' : '4rem'}; margin: 0 0 10px 0; text-shadow: 0 0 20px rgba(255,255,255,0.2); color: var(--text-main);">My Projects</h2>
                    <p style="color: var(--text-muted); font-size: ${isMobileLayout ? '1rem' : '1.2rem'}; letter-spacing: 0.05em; margin: 0 0 10px 0;">Hover and click to see my projects</p>
                    <p style="color: var(--primary); font-size: ${isMobileLayout ? '1rem' : '1.2rem'}; font-weight: 600; margin: 0; animation: subtleBounce 2s infinite;">Keep scrolling down! <i class="fas fa-arrow-down"></i></p>
                `;
                section.appendChild(mainTitle);
            }

            titleEl = document.createElement('h3');
            titleEl.textContent = cat;
            titleEl.style.position = 'absolute';
            titleEl.style.left = '50%';
            titleEl.style.transform = 'translateX(-50%)';
            // Define colors matching the background planets
            const themeColors = ['#b48cff', '#64b4ff', '#ff6482'];
            const titleColor = themeColors[index % themeColors.length];

            titleEl.style.fontSize = '2.5rem';
            titleEl.style.color = titleColor;
            titleEl.style.textShadow = `0 0 15px ${titleColor}`;
            titleEl.style.pointerEvents = 'none';
            titleEl.style.zIndex = '10';
            titleEl.style.animation = 'uiFadeInCenter 1.2s ease-out 0.8s both'; // Fades in slowly while keeping -50% translateX
            section.appendChild(titleEl);
        }

        // Stars are placed around (0, 0) here and moved into position by layoutSections()
        const catStars = [];
        categories[cat].forEach((project, pIndex) => {
            let placed = false;
            let x, y;
            let attempts = 0;

            while (!placed && attempts < 150) {
                const angle = Math.random() * Math.PI * 2;
                const radius = (60 + Math.random() * 200) * starScale;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;

                // Ensure stars aren't too close to each other
                let tooClose = false;
                for (let i = 0; i < catStars.length; i++) {
                    const other = catStars[i];
                    const dist = Math.sqrt(Math.pow(x - other.relX, 2) + Math.pow(y - other.relY, 2));
                    if (dist < 40 * starSize) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) {
                    placed = true;
                }
                attempts++;
            }

            const star = {
                relX: x,
                relY: y,
                originalAnchorX: x,
                originalAnchorY: y,
                anchorX: x,
                anchorY: y,
                x: x,
                y: y,
                colorTheme: index,
                vx: 0,
                vy: 0,
                driftOffsetX: Math.random() * Math.PI * 2,
                driftOffsetY: Math.random() * Math.PI * 2,
                driftSpeedX: 0.0003 + Math.random() * 0.0004,
                driftSpeedY: 0.0003 + Math.random() * 0.0004,
                driftRadius: (15 + Math.random() * 20) * starScale,
                twinkleOffset: Math.random() * Math.PI * 2,
                baseRadius: (10 + Math.random() * 6) * starSize,
                currentRadius: 10 * starSize,
                project: project,
                category: cat
            };
            constellations.push(star);
            catStars.push(star);
        });

        // Project list; hovering an item spotlights it and links it to its star
        let listWrap = null;
        if (section) {
            listWrap = document.createElement('div');
            listWrap.className = 'constellation-list';
            listWrap.style.width = `${listWidth}px`;
            listWrap.style.setProperty('--accent-rgb', listThemes[index % listThemes.length]);

            const inner = document.createElement('div');
            inner.className = 'constellation-list-inner';

            const heading = document.createElement('p');
            heading.className = 'constellation-list-heading';
            heading.textContent = `${catStars.length} project${catStars.length === 1 ? '' : 's'}`;
            inner.appendChild(heading);

            catStars.forEach(star => {
                const item = document.createElement('a');
                item.className = 'constellation-list-item';
                item.href = projectUrl(star);

                // Thumbnail: small local copy, then the full image, then a "No image" tile
                const thumb = document.createElement('span');
                thumb.className = 'constellation-list-thumb';
                const showNoImage = () => {
                    thumb.classList.add('is-empty');
                    thumb.innerHTML = '<i class="far fa-image"></i><span>No image</span>';
                };
                if (star.project.imageUrl) {
                    const img = document.createElement('img');
                    img.src = `assets/thumbs/${star.project.id}.jpg`;
                    img.alt = '';
                    img.loading = 'lazy';
                    img.decoding = 'async';
                    let triedFullImage = false;
                    img.addEventListener('error', () => {
                        if (!triedFullImage) {
                            triedFullImage = true;
                            img.src = star.project.imageUrl;
                        } else {
                            showNoImage();
                        }
                    });
                    thumb.appendChild(img);
                } else {
                    showNoImage();
                }
                item.appendChild(thumb);

                const text = document.createElement('span');
                text.className = 'constellation-list-text';

                const titleRow = document.createElement('span');
                titleRow.className = 'constellation-list-title';

                const label = document.createElement('span');
                label.textContent = star.project.title;
                titleRow.appendChild(label);

                const arrow = document.createElement('i');
                arrow.className = 'fas fa-arrow-right';
                titleRow.appendChild(arrow);
                text.appendChild(titleRow);

                if (star.project.shortDescription) {
                    const desc = document.createElement('span');
                    desc.className = 'constellation-list-desc';
                    desc.innerHTML = star.project.shortDescription;
                    text.appendChild(desc);
                }
                item.appendChild(text);

                const show = () => { if (!isWarping) listHoverStar = star; };
                const hide = () => { if (!isWarping && listHoverStar === star) listHoverStar = null; };
                // Mouse only: on touch screens a tap goes straight to the click below
                item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(); });
                item.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
                item.addEventListener('focus', show);
                item.addEventListener('blur', hide);
                item.addEventListener('click', (e) => {
                    // Let cmd/ctrl/shift-click open the project in a new tab as usual
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    if (!isWarping) warpToStar(star);
                });

                star.listItem = item;
                star.listWrap = listWrap;
                inner.appendChild(item);
            });

            listWrap.appendChild(inner);
            section.appendChild(listWrap);
        }

        sectionLayouts.push({ titleEl, listWrap, stars: catStars });
    });

    // Size sections so the tallest list fits, then place each title, list and constellation
    function layoutSections() {
        const contentHeight = (l) => {
            const listH = l.listWrap ? l.listWrap.offsetHeight : 0;
            return sideBySide ? Math.max(listH, miniR * 2) : miniR * 2 + 12 + listH;
        };
        const titleHeight = (l) => (l.titleEl ? l.titleEl.offsetHeight : 64);

        sectionHeight = Math.max(window.innerHeight, ...sectionLayouts.map(l => titleHeight(l) + 16 + contentHeight(l) + 90));
        layoutBottom = 0;
        const titleTops = [];

        sectionLayouts.forEach((l, index) => {
            const titleTop = spacingCoef * window.innerHeight + index * sectionHeight - titleOffset;
            const contentTop = titleTop + titleHeight(l) + 16;
            const listH = l.listWrap ? l.listWrap.offsetHeight : 0;
            const listLeft = (width - listWidth) / 2;
            let centerX, centerY, listTop;

            if (sideBySide) {
                // List centered under the title, constellation vertically centered beside it, on the
                // side away from the section's background planet/rocket/nebula (right on even sections, see draw())
                const bandH = Math.max(listH, miniR * 2);
                const decorOnRight = index % 2 === 0;
                centerX = decorOnRight ? listLeft - 70 - miniR : listLeft + listWidth + 70 + miniR;
                centerY = contentTop + bandH / 2;
                listTop = contentTop;
            } else {
                // Constellation above the list, on its right (clear of the side nav buttons)
                centerX = listLeft + listWidth - miniR;
                centerY = contentTop + miniR;
                listTop = contentTop + miniR * 2 + 12;
            }

            if (l.titleEl) l.titleEl.style.top = `${titleTop}px`;
            if (l.listWrap) {
                l.listWrap.style.top = `${listTop}px`;
                l.listWrap.style.left = `${listLeft}px`;
            }
            l.stars.forEach(star => {
                star.originalAnchorX = star.anchorX = star.x = centerX + star.relX;
                star.originalAnchorY = star.anchorY = star.y = centerY + star.relY;
            });

            titleTops.push(titleTop);
            layoutBottom = Math.max(layoutBottom, contentTop + contentHeight(l) + 90);
        });

        window.constellationTitleTops = titleTops; // Used by the side nav buttons to scroll to each section
        resize();
    }

    layoutSections();
    // Web fonts can change list heights once loaded
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutSections);

    function setActiveListItem(star) {
        if (activeListItem) {
            activeListItem.classList.remove('active');
            activeListItem.parentElement.classList.remove('has-active');
        }
        activeListItem = star && star.listItem ? star.listItem : null;
        if (activeListItem) {
            activeListItem.classList.add('active');
            activeListItem.parentElement.classList.add('has-active');
        }
    }

    // Background stars
    const bgStars = [];
    for(let i=0; i<150; i++) {
        bgStars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 6 + 2, // Added z property for parallax math
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
        setActiveListItem(null);
    });

    function projectUrl(star) {
        let bgType = 'planet';
        if(star.colorTheme === 1) bgType = 'spaceship';
        if(star.colorTheme === 2) bgType = 'nebula';

        return `project.html?id=${star.project.id}&theme=${star.colorTheme}&bg=${bgType}`;
    }

    function warpToStar(star) {
        isWarping = true;
        clickedStarRef = star;
        listHoverStar = star; // Keep the project spotlighted while warping (the feedback for a tap on phones)
        warpRadius = 0;
        document.body.style.pointerEvents = 'none'; // disable clicks during warp
        tooltip.style.opacity = '0';

        const targetUrl = projectUrl(star);
        setTimeout(() => {
            window.location.assign(targetUrl);
        }, 800);
    }

    function starAt(x, y) {
        return constellations.find(star => Math.hypot(x - star.x, y - star.y) < starHitRadius) || null;
    }

    canvas.addEventListener('click', (e) => {
        // Hit-test at the click itself so a single tap works on touch screens
        const rect = canvas.getBoundingClientRect();
        const star = starAt(e.clientX - rect.left, e.clientY - rect.top);
        if (star && !isWarping) {
            warpToStar(star);
        }
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const timeMs = Date.now();
        const time = timeMs * 0.002;

        // Parallax smooth interpolation
        currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
        currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;

        // Shift background image (reduced parallax)
        const bgSection = document.getElementById('constellation-section');
        if (bgSection && !isWarping) {
            bgSection.style.backgroundPosition = `calc(50% + ${currentParallaxX * 5}px) calc(50% + ${currentParallaxY * 5}px)`;
        }

        // Draw planet or spaceship in the background for each section
        const isMobileRender = window.innerWidth <= 768;
        const renderSpacing = isMobileRender ? 1.4 : 1.1;

        for (let i = 0; i < numCategories; i++) {
            const planetY = renderSpacing * window.innerHeight + i * (sectionHeight || window.innerHeight) + currentParallaxY * 2;
            const planetX = (i % 2 === 0 ? width * 0.8 : width * 0.2) + currentParallaxX * 2;
            
            if (i === 1) {
                drawSpaceship(ctx, planetX, planetY, 80);
            } else if (i === 2) {
                drawNebulaCloud(ctx, planetX, planetY, 140, time);
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
            
            let drawX = s.x + currentParallaxX * s.z;
            let drawY = s.y + currentParallaxY * s.z;
            
            const twinkle = Math.sin(time + s.twinkleOffset) * 0.5 + 0.5; // 0.0 to 1.0
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`; // Max opacity 0.8
            ctx.beginPath();
            ctx.arc(drawX, drawY, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Spawn and draw space objects
        spawnShootingStar();
        drawShootingStars(ctx);

        // Update main stars
        let currentHover = null;

        constellations.forEach(star => {
            // Organic drifting logic
            let drawX = star.anchorX + Math.sin(timeMs * star.driftSpeedX + star.driftOffsetX) * star.driftRadius + currentParallaxX * 12 * starScale;
            let drawY = star.anchorY + Math.cos(timeMs * star.driftSpeedY + star.driftOffsetY) * star.driftRadius + currentParallaxY * 12 * starScale;
            
            star.x = drawX;
            star.y = drawY;
            
            // Check hover
            const dx = mouseX - star.x;
            const dy = mouseY - star.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < starHitRadius || star === listHoverStar) {
                currentHover = star;
                star.currentRadius = star.baseRadius * 1.5;
            } else {
                star.currentRadius = star.baseRadius;
            }
        });

        if (listHoverStar) currentHover = listHoverStar;

        // Draw connecting lines for same categories
        ctx.lineWidth = 2 * starSize;
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
                    
                    let alpha = Math.max(0.03, 0.6 - (dist / starScale / 400)); // Same look as the full-size constellation
                    
                    if (category === 'AI/ML') {
                        ctx.strokeStyle = `rgba(150, 140, 255, ${alpha + 0.1})`;
                    } else if (category === 'Data Analytics') {
                        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha + 0.1})`;
                    } else {
                        // Cloud / Full-Stack is red
                        ctx.strokeStyle = `rgba(255, 69, 0, ${alpha + 0.1})`;
                    }
                    
                    ctx.beginPath();
                    ctx.moveTo(constellations[i].x, constellations[i].y);
                    ctx.lineTo(constellations[j].x, constellations[j].y);
                    ctx.stroke();
                }
            }
        }

        // Spotlight thread: a glowing line drawn from the hovered list item to its star (side-by-side layout)
        if (currentHover && sideBySide && currentHover.listItem) {
            if (threadStar !== currentHover) {
                threadStar = currentHover;
                threadProgress = 0;
            }
            threadProgress += (1 - threadProgress) * 0.12;
            const rgb = listThemes[currentHover.colorTheme % listThemes.length];
            const canvasRect = canvas.getBoundingClientRect();
            const itemRect = currentHover.listItem.getBoundingClientRect();
            const listRect = currentHover.listWrap.getBoundingClientRect();
            const starOnLeft = currentHover.x < listRect.left - canvasRect.left;
            const sx = (starOnLeft ? listRect.left : listRect.right) - canvasRect.left;
            const sy = itemRect.top + itemRect.height / 2 - canvasRect.top;
            const ex = sx + (currentHover.x - sx) * threadProgress;
            const ey = sy + (currentHover.y - sy) * threadProgress;

            const threadGrad = ctx.createLinearGradient(sx, sy, ex, ey);
            threadGrad.addColorStop(0, `rgba(${rgb}, 0.15)`);
            threadGrad.addColorStop(1, `rgba(${rgb}, 0.9)`);
            ctx.save();
            ctx.strokeStyle = threadGrad;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.fillStyle = `rgba(${rgb}, 0.9)`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw stars
        constellations.forEach(star => {
            // Dim if filtered out
            const isDimmed = activeFilter !== 'all' && star.category !== activeFilter;
            // Fade the other stars of a spotlighted constellation
            const isOutOfSpotlight = currentHover && star !== currentHover && star.category === currentHover.category;

            // Subtle twinkle effect
            const twinkle = Math.sin(time + star.twinkleOffset) * 0.3 + 0.7; // oscillates between 0.4 and 1.0
            ctx.globalAlpha = isDimmed ? 0.1 : (isOutOfSpotlight ? twinkle * 0.45 : twinkle);
            
            if (star.category === 'AI/ML') {
                ctx.fillStyle = '#968CFF'; // Brighter purple
                ctx.shadowColor = '#968CFF';
            } else if (star.category === 'Data Analytics') {
                ctx.fillStyle = '#00FFFF';
                ctx.shadowColor = '#00FFFF';
            } else {
                ctx.fillStyle = '#FF4500'; // Orange Red
                ctx.shadowColor = '#FF4500';
            }
            
            ctx.shadowBlur = isDimmed ? 0 : 25 * starSize;

            // Draw 4-point star flare
            drawStarShape(ctx, star.x, star.y, 4, star.currentRadius * 1.5, star.currentRadius * 0.3);
            ctx.fill();

            ctx.shadowBlur = 0; // reset
            ctx.globalAlpha = 1.0; // reset
        });

        // Soft pulse ring around the spotlighted star
        if (currentHover) {
            const rgb = listThemes[currentHover.colorTheme % listThemes.length];
            const t = (timeMs % 1600) / 1600;
            ctx.beginPath();
            ctx.arc(currentHover.x, currentHover.y, currentHover.currentRadius * (1.4 + t * 2.2), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb}, ${0.7 * (1 - t)})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Geometric expanding pulse on click
        if (isWarping && clickedStarRef) {
            warpRadius += width / 60; // Expand rate
            const opacity = Math.max(0, 1 - (warpRadius / (width * 0.8)));
            
            let pulseColor = '255, 255, 255';
            if(clickedStarRef.colorTheme === 0) pulseColor = '180, 140, 255';
            else if(clickedStarRef.colorTheme === 1) pulseColor = '0, 255, 255';
            else if(clickedStarRef.colorTheme === 2) pulseColor = '255, 69, 0';

            ctx.save();
            ctx.translate(clickedStarRef.x, clickedStarRef.y);
            
            // Draw spinning inner hexagon
            ctx.rotate(warpRadius * 0.05);
            ctx.beginPath();
            for(let j=0; j<=6; j++) {
                const angle = j * Math.PI / 3;
                const hx = Math.cos(angle) * warpRadius * 0.5;
                const hy = Math.sin(angle) * warpRadius * 0.5;
                if(j===0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.strokeStyle = `rgba(${pulseColor}, ${opacity})`;
            ctx.lineWidth = 4 + (warpRadius * 0.01);
            ctx.shadowColor = `rgba(${pulseColor}, ${opacity})`;
            ctx.shadowBlur = 20;
            ctx.stroke();

            // Draw counter-spinning outer hexagon
            ctx.rotate(-warpRadius * 0.1);
            ctx.beginPath();
            for(let j=0; j<=6; j++) {
                const angle = j * Math.PI / 3;
                const hx = Math.cos(angle) * warpRadius;
                const hy = Math.sin(angle) * warpRadius;
                if(j===0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.strokeStyle = `rgba(${pulseColor}, ${opacity * 0.5})`;
            ctx.lineWidth = 2 + (warpRadius * 0.005);
            ctx.stroke();

            ctx.restore();
        }

        // Spotlight the hovered star's project in the list (the old floating quick view is no longer shown)
        if (currentHover) {
            if (hoveredStar !== currentHover) {
                hoveredStar = currentHover;
                setActiveListItem(hoveredStar);
                canvas.style.cursor = 'pointer';
            }
        } else {
            if (hoveredStar) {
                hoveredStar = null;
                canvas.style.cursor = 'crosshair';
                setActiveListItem(null);
            }
        }

        requestAnimationFrame(draw);
    }

    draw();
});
