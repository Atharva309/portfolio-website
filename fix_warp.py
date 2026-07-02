import re

with open('constellation.js', 'r') as f:
    content = f.read()

# 1. Add originalAnchorX and originalAnchorY to constellations
content = content.replace(
    "anchorX: x,\n                anchorY: y,",
    "originalAnchorX: x,\n                originalAnchorY: y,\n                anchorX: x,\n                anchorY: y,"
)

# 2. Add pageshow listener to reset warp and restore anchors
content = content.replace(
    "let warpSpeed = 0;",
    """let warpSpeed = 0;

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
    });"""
)

# 3. Inside canvas.addEventListener('click'), also restore anchors just in case
content = content.replace(
    """isWarping = false;
                warpSpeed = 0;
                document.body.style.pointerEvents = 'auto';""",
    """isWarping = false;
                warpSpeed = 0;
                document.body.style.pointerEvents = 'auto';
                constellations.forEach(star => {
                    star.anchorX = star.originalAnchorX;
                    star.anchorY = star.originalAnchorY;
                });"""
)

with open('constellation.js', 'w') as f:
    f.write(content)
