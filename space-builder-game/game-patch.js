// Game State
let currentLevel = 0;
const levels = [
    {
        // Level 1: Simple Gravity Assist
        startPos: { x: 500, y: 500 },
        planets: [
            { x: 1500, y: 500, radius: 150, mass: 1.5, color: '#3498db' }
        ],
        goal: { x: 2500, y: 500, radius: 80 }
    },
    {
        // Level 2: Slingshot between two
        startPos: { x: 300, y: 300 },
        planets: [
            { x: 1000, y: 200, radius: 120, mass: 1.2, color: '#e74c3c' },
            { x: 1800, y: 800, radius: 180, mass: 1.8, color: '#9b59b6' }
        ],
        goal: { x: 2500, y: 200, radius: 80 }
    },
    {
        // Level 3: Planet wall
        startPos: { x: 300, y: 500 },
        planets: [
            { x: 1200, y: 200, radius: 150, mass: 1.5, color: '#f1c40f' },
            { x: 1200, y: 800, radius: 150, mass: 1.5, color: '#e67e22' }
        ],
        goal: { x: 2200, y: 500, radius: 80 }
    },
    {
        // Level 4: The massive sun
        startPos: { x: 300, y: 800 },
        planets: [
            { x: 1500, y: 500, radius: 250, mass: 2.5, color: '#e74c3c' }
        ],
        goal: { x: 2700, y: 200, radius: 80 }
    },
    {
        // Level 5: Asteroid field
        startPos: { x: 200, y: 500 },
        planets: [
            { x: 800, y: 300, radius: 80, mass: 0.8, color: '#7f8c8d' },
            { x: 1200, y: 700, radius: 90, mass: 0.9, color: '#7f8c8d' },
            { x: 1600, y: 200, radius: 70, mass: 0.7, color: '#7f8c8d' },
            { x: 2000, y: 800, radius: 100, mass: 1.0, color: '#7f8c8d' },
            { x: 2400, y: 400, radius: 110, mass: 1.1, color: '#7f8c8d' }
        ],
        goal: { x: 3000, y: 500, radius: 80 }
    }
];
