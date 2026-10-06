// About page background planet: a canvas-drawn gas giant with drifting cloud bands, a soft
// breathing glow, an orbiting dust ring that passes behind and in front of it, and a moon.
// Scrolling tilts the ring a little and gives the planet a spin.
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('planet-container');
    const canvas = document.getElementById('about-planet-canvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const LIGHT = { x: -0.45, y: -0.45 }; // Light comes from the upper left (in planet radii)
    const RING_SQUASH = 0.2;              // How flat the ring looks (viewing angle)
    const BASE_TILT = -0.32;              // Ring/band tilt in radians

    let S, C, R, cx, cy, dpr;
    let view = { x: 0, y: 0, w: 0, h: 0 }; // Part of the canvas that is actually on screen
    let halo, body, overlay, bandTex, bandW, bandLayer, bandCtx;
    let particles = [];
    let spin = 0;          // Planet rotation (radians of longitude)
    let boost = 0;         // Extra spin from scrolling, decays over time
    let scrollTilt = 0;
    let lastScrollY = window.scrollY;
    let lastTime = performance.now();

    // Small seeded random so the planet looks the same on every visit
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    function offscreen(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        return [c, g];
    }

    function setup() {
        S = container.offsetWidth;
        C = S * 2;
        R = S / 2;
        cx = cy = C / 2;
        dpr = Math.min(window.devicePixelRatio || 1, S > 600 ? 1.25 : 2);
        canvas.width = Math.round(C * dpr);
        canvas.height = Math.round(C * dpr);

        // Only draw what is visible (the canvas spans well past the screen edges)
        const left = container.offsetLeft - S / 2;
        const top = container.offsetTop - S / 2;
        const x0 = Math.max(0, -left), y0 = Math.max(0, -top);
        view = { x: x0, y: y0, w: Math.min(C, window.innerWidth - left) - x0, h: Math.min(C, window.innerHeight - top) - y0 };

        seed = 7;
        let g;

        // Soft atmosphere glow around the planet
        [halo, g] = offscreen(C, C);
        let grad = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.55);
        grad.addColorStop(0, 'rgba(150, 130, 255, 0.34)');
        grad.addColorStop(0.3, 'rgba(120, 100, 235, 0.13)');
        grad.addColorStop(1, 'rgba(80, 60, 200, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, C, C);

        // Planet body, lit from the upper left
        [body, g] = offscreen(C, C);
        grad = g.createRadialGradient(cx + LIGHT.x * R * 0.9, cy + LIGHT.y * R * 0.9, 0, cx, cy, R * 1.9);
        grad.addColorStop(0, '#7458a8');
        grad.addColorStop(0.35, '#4b3275');
        grad.addColorStop(0.7, '#26173f');
        grad.addColorStop(1, '#0b0614');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx, cy, R, 0, Math.PI * 2);
        g.fill();

        // Shadow side and darker edges for depth, plus the rim light, in one overlay layer
        [overlay, g] = offscreen(C, C);
        g.save();
        g.beginPath();
        g.arc(cx, cy, R + 0.5, 0, Math.PI * 2);
        g.clip();
        grad = g.createRadialGradient(cx + LIGHT.x * R * 0.6, cy + LIGHT.y * R * 0.6, R * 0.2, cx, cy, R * 1.6);
        grad.addColorStop(0, 'rgba(3, 2, 10, 0)');
        grad.addColorStop(0.55, 'rgba(3, 2, 10, 0.28)');
        grad.addColorStop(1, 'rgba(3, 2, 10, 0.92)');
        g.fillStyle = grad;
        g.fillRect(0, 0, C, C);
        grad = g.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
        grad.addColorStop(0, 'rgba(3, 2, 10, 0)');
        grad.addColorStop(1, 'rgba(3, 2, 10, 0.5)');
        g.fillStyle = grad;
        g.fillRect(0, 0, C, C);
        g.restore();

        // Rim light: soft lavender on the lit edge, a faint cyan glow on the far edge
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        g.shadowBlur = R * 0.05;
        g.lineWidth = Math.max(1.5, R * 0.009);
        g.shadowColor = 'rgba(200, 180, 255, 0.6)';
        g.strokeStyle = 'rgba(210, 190, 255, 0.22)';
        g.beginPath();
        g.arc(cx, cy, R - g.lineWidth / 2, Math.PI * 0.95, Math.PI * 1.6);
        g.stroke();
        g.shadowColor = 'rgba(90, 220, 255, 0.9)';
        g.strokeStyle = 'rgba(110, 220, 255, 0.28)';
        g.beginPath();
        g.arc(cx, cy, R - g.lineWidth / 2, -Math.PI * 0.2, Math.PI * 0.55);
        g.stroke();

        // Cloud band texture: one full turn of the planet is 4R wide; drawn twice so it wraps
        bandW = R * 4;
        const bandH = R * 2;
        [bandTex, g] = offscreen(bandW * 2, bandH);
        if ('filter' in g) g.filter = `blur(${Math.max(1, R * 0.01)}px)`;
        const palette = [
            'rgba(215, 195, 255, ALPHA)', 'rgba(25, 12, 55, ALPHA)', 'rgba(215, 195, 255, ALPHA)',
            'rgba(120, 225, 255, ALPHA)', 'rgba(25, 12, 55, ALPHA)', 'rgba(255, 185, 140, ALPHA)'
        ];
        // Each band is one strip across both copies (its waves repeat every bandW), so there is no seam
        seed = 11;
        let y = 0;
        let i = 0;
        const bx0 = -bandW * 0.05, bx1 = bandW * 2.05, step = bandW / 120;
        while (y < bandH) {
            const h = bandH * (0.03 + rand() * 0.07);
            const color = palette[i % palette.length].replace('ALPHA', (0.04 + rand() * 0.1).toFixed(3));
            const k1 = 1 + Math.floor(rand() * 4), k2 = 3 + Math.floor(rand() * 5);
            const p1 = rand() * Math.PI * 2, p2 = rand() * Math.PI * 2;
            const amp = R * (0.006 + rand() * 0.018);
            const wave = (x) => Math.sin((x / bandW) * Math.PI * 2 * k1 + p1) * amp + Math.sin((x / bandW) * Math.PI * 2 * k2 + p2) * amp * 0.4;
            g.fillStyle = color;
            g.beginPath();
            for (let x = bx0; x <= bx1; x += step) g.lineTo(x, y + wave(x));
            for (let x = bx1; x >= bx0; x -= step) g.lineTo(x, y + h + wave(x + bandW * 0.3));
            g.closePath();
            g.fill();
            y += h;
            i++;
        }
        // A few soft oval storms, repeated in both copies
        for (let s = 0; s < 3; s++) {
            const sx = rand() * bandW, sy = bandH * (0.25 + rand() * 0.5);
            const sw = R * (0.12 + rand() * 0.1), sh = sw * 0.38;
            for (const cxs of [sx - bandW, sx, sx + bandW, sx + bandW * 2]) {
                const sg = g.createRadialGradient(cxs, sy, 0, cxs, sy, sw);
                sg.addColorStop(0, 'rgba(230, 215, 255, 0.22)');
                sg.addColorStop(1, 'rgba(230, 215, 255, 0)');
                g.fillStyle = sg;
                g.beginPath();
                g.ellipse(cxs, sy, sw, sh, 0, 0, Math.PI * 2);
                g.fill();
            }
        }

        // Unrotated layer the bands are mapped into each frame (pixel aligned, so slices never overlap)
        bandLayer = document.createElement('canvas');
        bandLayer.width = bandLayer.height = Math.ceil(R * 2 * dpr);
        bandCtx = bandLayer.getContext('2d');

        // Ring dust: particles orbit faster closer in, with a darker gap partway out
        particles = [];
        const count = S > 600 ? 1100 : 550;
        seed = 23;
        while (particles.length < count) {
            const r = 1.32 + rand() * 0.56;
            if (r > 1.56 && r < 1.61 && rand() < 0.85) continue;
            particles.push({
                r,
                a: rand() * Math.PI * 2,
                w: 0.09 / Math.pow(r, 1.5),
                size: 0.5 + rand() * (S > 600 ? 1.3 : 0.9),
                group: Math.floor(rand() * 6)
            });
        }
    }

    // Colors for the ring dust: warm gold and soft lavender at a few brightness levels
    const dustColors = [
        'rgba(255, 225, 170, 0.75)', 'rgba(255, 225, 170, 0.45)', 'rgba(255, 225, 170, 0.22)',
        'rgba(200, 180, 255, 0.7)', 'rgba(200, 180, 255, 0.4)', 'rgba(200, 180, 255, 0.2)'
    ];

    function drawRing(t, tilt, front) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);

        // Faint ring bands
        const from = front ? 0 : Math.PI, to = front ? Math.PI : Math.PI * 2;
        [[1.36, 0.10], [1.47, 0.07], [1.66, 0.09], [1.8, 0.05]].forEach(([rr, alpha]) => {
            ctx.beginPath();
            ctx.ellipse(0, 0, R * rr, R * rr * RING_SQUASH, 0, from, to);
            ctx.strokeStyle = `rgba(215, 200, 240, ${alpha * 0.8})`;
            ctx.lineWidth = R * 0.045;
            ctx.stroke();
        });

        // Dust particles, grouped by color to keep drawing fast
        for (let gi = 0; gi < dustColors.length; gi++) {
            ctx.fillStyle = dustColors[gi];
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                if (p.group !== gi) continue;
                const a = p.a + t * p.w;
                const sin = Math.sin(a);
                if ((sin >= 0) !== front) continue;
                const x = Math.cos(a) * p.r * R;
                const y = sin * p.r * R * RING_SQUASH;
                ctx.fillRect(x, y, p.size, p.size);
            }
        }
        ctx.restore();
    }

    function drawMoon(t, tilt, front) {
        const a = t * (Math.PI * 2 / 55) + 0.3; // Starts on the visible side, in front of the ring
        const sin = Math.sin(a);
        if ((sin >= 0) !== front) return;
        const ox = Math.cos(a) * R * 1.95, oy = sin * R * 0.42;
        const rot = tilt + 0.18;
        const x = cx + ox * Math.cos(rot) - oy * Math.sin(rot);
        const y = cy + ox * Math.sin(rot) + oy * Math.cos(rot);
        const mr = R * 0.07 * (1 + 0.15 * sin);

        ctx.save();
        ctx.shadowColor = 'rgba(200, 190, 255, 0.35)';
        ctx.shadowBlur = mr * 0.8;
        const grad = ctx.createRadialGradient(x - mr * 0.4, y - mr * 0.4, mr * 0.1, x, y, mr);
        grad.addColorStop(0, '#dcd8ea');
        grad.addColorStop(0.55, '#7d7894');
        grad.addColorStop(1, '#16121f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBands(tilt) {
        // Map the band texture onto the sphere in thin vertical slices so the clouds bunch up
        // toward the edges and appear to rotate around it. Slices are snapped to whole pixels
        // in an unrotated layer so neighbours never overlap, then the layer is tilted into place.
        const size = bandLayer.width;
        const half = size / 2;
        bandCtx.clearRect(0, 0, size, size);
        const slices = 90;
        const offset = ((spin / (Math.PI * 2)) * bandW) % bandW;
        const scale = bandTex.width / (bandW * 2);
        let prevX = 0;
        for (let i = 0; i < slices; i++) {
            const p0 = -Math.PI / 2 + (Math.PI * i) / slices;
            const p1 = -Math.PI / 2 + (Math.PI * (i + 1)) / slices;
            const nextX = Math.round(half + Math.sin(p1) * half);
            if (nextX <= prevX) continue;
            let u = ((p0 / (Math.PI * 2)) * bandW + offset) % bandW;
            if (u < 0) u += bandW;
            const uw = (bandW * (p1 - p0)) / (Math.PI * 2);
            bandCtx.drawImage(bandTex, u * scale, 0, uw * scale, bandTex.height, prevX, 0, nextX - prevX, size);
            prevX = nextX;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.drawImage(bandLayer, -R * 1.02, -R * 1.02, R * 2.04, R * 2.04);
        ctx.restore();
    }

    // Draw a full-canvas cached layer, but only the part that is on screen
    function drawLayer(layer) {
        ctx.drawImage(layer, view.x * dpr, view.y * dpr, view.w * dpr, view.h * dpr, view.x, view.y, view.w, view.h);
    }

    function frame(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const t = now / 1000;
        spin += dt * (Math.PI * 2 / 140 + boost);
        boost *= Math.pow(0.15, dt);
        const tilt = BASE_TILT + scrollTilt;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(view.x, view.y, view.w, view.h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(view.x, view.y, view.w, view.h);
        ctx.clip();

        ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 0.7); // Slow breathing glow
        drawLayer(halo);
        ctx.globalAlpha = 1;

        drawMoon(t, tilt, false);
        drawRing(t, tilt, false);
        drawLayer(body);
        drawBands(tilt);
        drawLayer(overlay);
        drawRing(t, tilt, true);
        drawMoon(t, tilt, true);

        ctx.restore();
        if (!reduceMotion) requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const fraction = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
        scrollTilt = fraction * 0.25;
        boost = Math.min(boost + Math.abs(window.scrollY - lastScrollY) * 0.0006, 1.2);
        lastScrollY = window.scrollY;
        if (reduceMotion) requestAnimationFrame(frame);
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setup();
            if (reduceMotion) requestAnimationFrame(frame);
        }, 150);
    });

    setup();
    requestAnimationFrame(frame);
});
