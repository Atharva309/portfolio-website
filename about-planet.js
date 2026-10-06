// About page background planet, kept to simple shapes: a gradient planet with a few clean bands
// and two soft spots that rotate around it, a gently breathing glow, one ring with a few dots
// orbiting along it (passing behind and in front of the planet), and a moon that circles it.
// Scrolling tilts the ring a little and gives the planet a spin.
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('planet-container');
    const canvas = document.getElementById('about-planet-canvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const RING_SQUASH = 0.22; // How flat the ring looks (viewing angle)
    const RING_RADIUS = 1.42; // In planet radii
    const BASE_TILT = -0.32;  // Ring/band tilt in radians

    let S, C, R, cx, cy, dpr;
    let view = { x: 0, y: 0, w: 0, h: 0 }; // Part of the canvas currently on screen
    let halo, body, bandTex, bandW, bandLayer, bandCtx;
    let dots = [];
    let spin = 0;          // Planet rotation (radians of longitude)
    let boost = 0;         // Extra spin from scrolling, decays over time
    let scrollTilt = 0;
    let lastScrollY = window.scrollY;
    let lastTime = performance.now();
    const startTime = performance.now();

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
        let g;

        // Soft glow around the planet
        [halo, g] = offscreen(C, C);
        let grad = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.45);
        grad.addColorStop(0, 'rgba(150, 130, 255, 0.22)');
        grad.addColorStop(1, 'rgba(150, 130, 255, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, C, C);

        // Planet body: the same simple gradient as before (lit from the upper left)
        [body, g] = offscreen(C, C);
        grad = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 0, cx - R * 0.4, cy - R * 0.4, R * 1.98);
        grad.addColorStop(0, '#76569f');
        grad.addColorStop(0.7, '#301f46');
        grad.addColorStop(1, '#11091d');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx, cy, R, 0, Math.PI * 2);
        g.fill();

        // Surface: a few clean bands and two soft spots. One full turn is 4R wide, drawn twice so it wraps.
        bandW = R * 4;
        [bandTex, g] = offscreen(bandW * 2, R * 2);
        [[0.5, 0.2, 0.09], [1.0, 0.26, 0.06], [1.48, 0.12, 0.08]].forEach(([y, h, alpha]) => {
            g.fillStyle = `rgba(200, 180, 255, ${alpha})`;
            g.fillRect(0, R * y, bandW * 2, R * h);
        });
        [[0.3, 0.72, 0.13, 'rgba(210, 190, 255, 0.13)'], [0.72, 1.3, 0.08, 'rgba(20, 10, 40, 0.22)']].forEach(([x, y, r, color]) => {
            g.fillStyle = color;
            for (const copy of [-1, 0, 1, 2]) {
                g.beginPath();
                g.arc((x + copy) * bandW, R * y, R * r, 0, Math.PI * 2);
                g.fill();
            }
        });

        // Unrotated layer the surface is mapped into each frame (pixel aligned, so slices never overlap)
        bandLayer = document.createElement('canvas');
        bandLayer.width = bandLayer.height = Math.ceil(R * 2 * dpr);
        bandCtx = bandLayer.getContext('2d');

        // A few dots orbiting along the ring
        dots = [];
        const count = S > 600 ? 70 : 45;
        for (let i = 0; i < count; i++) {
            dots.push({
                r: RING_RADIUS + (Math.random() - 0.5) * 0.08,
                a: (i / count) * Math.PI * 2 + Math.random() * 0.2,
                size: (S > 600 ? 1.4 : 1) + Math.random() * 1.2,
                color: i % 3 === 0 ? 'rgba(210, 195, 255, 0.75)' : 'rgba(240, 215, 150, 0.7)'
            });
        }
    }

    // The canvas spans well past the screen, so once the planet is still only the visible part is
    // redrawn. While it slides in or flies away the whole planet is drawn, so no edge is ever cut off.
    function updateView() {
        const moving = container.getAnimations && container.getAnimations().some(a => a.playState === 'running');
        if (moving) {
            view = { x: 0, y: 0, w: C, h: C };
            return;
        }
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const k = C / rect.width;
        const x0 = Math.max(0, -rect.left * k), y0 = Math.max(0, -rect.top * k);
        const x1 = Math.min(C, (window.innerWidth - rect.left) * k);
        const y1 = Math.min(C, (window.innerHeight - rect.top) * k);
        view = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    function drawLayer(layer) {
        ctx.drawImage(layer, view.x * dpr, view.y * dpr, view.w * dpr, view.h * dpr, view.x, view.y, view.w, view.h);
    }

    function drawRing(t, tilt, front) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);

        // One clean ring band, split so the front half crosses over the planet
        ctx.beginPath();
        ctx.ellipse(0, 0, R * RING_RADIUS, R * RING_RADIUS * RING_SQUASH, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
        ctx.lineWidth = R * 0.07;
        ctx.stroke();

        // Orbiting dots
        for (const d of dots) {
            const a = d.a + t * 0.12;
            const sin = Math.sin(a);
            if ((sin >= 0) !== front) continue;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d.r * R, sin * d.r * R * RING_SQUASH, d.size, 0, Math.PI * 2);
            ctx.fill();
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

        const grad = ctx.createRadialGradient(x - mr * 0.4, y - mr * 0.4, 0, x - mr * 0.4, y - mr * 0.4, mr * 1.98);
        grad.addColorStop(0, '#a4a4b4');
        grad.addColorStop(0.7, '#5a5a6a');
        grad.addColorStop(1, '#11091d');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, mr, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSurface(tilt) {
        // Map the surface onto the sphere in thin vertical slices, so the spots squash toward the
        // edges and appear to rotate around the planet. Slices are snapped to whole pixels in an
        // unrotated layer so neighbours never overlap, then the layer is tilted into place.
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

    function frame(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const t = now / 1000;
        spin += dt * (Math.PI * 2 / 140 + boost);
        boost *= Math.pow(0.15, dt);
        const tilt = BASE_TILT + scrollTilt;

        updateView();
        if (view.w > 0 && view.h > 0) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(view.x, view.y, view.w, view.h);
            ctx.save();
            ctx.beginPath();
            ctx.rect(view.x, view.y, view.w, view.h);
            ctx.clip();

            ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.7); // Slow breathing glow
            drawLayer(halo);
            ctx.globalAlpha = 1;

            drawMoon(t, tilt, false);
            drawRing(t, tilt, false);
            drawLayer(body);
            drawSurface(tilt);
            drawRing(t, tilt, true);
            drawMoon(t, tilt, true);

            ctx.restore();
        }

        // With reduced motion, only keep drawing while the planet slides in
        if (!reduceMotion || now - startTime < 2000) requestAnimationFrame(frame);
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
