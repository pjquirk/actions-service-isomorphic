const worldWidth = 800;
const worldHeight = 800;
const pixelWidth = 10;
const pixelHeight = 10;
const pixelDepth = 10;

const circleRadius = 200;
const triangleSide = circleRadius;
const triangleHeight = triangleSide * Math.sqrt(3) / 2;

const fs = require('fs');
const { createCanvas } = require('canvas');
const obelisk = require('./obelisk-nodeshim')(() => createCanvas(worldWidth, worldHeight));

const isInCircle = (x,y) => {
    const distToOrigin = Math.sqrt(x*x + y*y);
    return distToOrigin < circleRadius;
};

const sign = (p1, p2, p3) => {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};

const isInPlayTriangle = (x,y) => {
    const pt = { x, y };

    const dx = 0;
    const dy = -2*pixelWidth;
    // left
    const v1 = { x: triangleSide / 2 + dx, y: triangleHeight / 2 + dy}
    // right
    const v2 = { x: -triangleSide / 2 + dx, y: triangleHeight / 2 + dy}
    // top
    const v3 = { x: 0 + dx, y: -triangleHeight / 2 + dy}

    const d1 = sign(pt, v1, v2);
    const d2 = sign(pt, v2, v3);
    const d3 = sign(pt, v3, v1);

    has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(has_neg && has_pos);
};

const getColor = (x,y) => {
    // Map x,y to circle (i.e. the HSV space)
    let theta = Math.atan(y/x);
    if (isNaN(theta)) {
        return 0x000000;
    }
    // account for negative inputs based on quadrant
    if (x < 0 && y > 0) {
        // quadrant 2
        theta += Math.PI;
    }
    if (x < 0 && y < 0) {
        // quadrant 3
        theta += Math.PI;
    }
    if (x > 0 && y < 0) {
        // quadrant 4
        theta += 2*Math.PI;
    }

    let r = Math.sqrt(x*x + y*y);
    const unitR = r / circleRadius;

    // Theta is hue, unitR is saturation.  We'll use a value of 1 for white
    let h = theta * 180 / Math.PI;
    const value = 1;
    const saturation = unitR;

    // flip h to match the color order in our logo
    h = 360 - h;
    // rotate colors to align yellow with tip of arrow
    h = (h - 45) % 360;

    const f = (n) => {
        const k = (n + h / 60) % 6;
        return value - (value * saturation * Math.max(0, Math.min(k, 4-k, 1)));
    };

    return Math.trunc(f(5) * 255) * Math.pow(2, 16) +
        Math.trunc(f(3) * 255) * Math.pow(2, 8) +
        Math.trunc(f(1) * 255);
}

// create view instance to nest everything
const canvas = createCanvas(worldWidth, worldHeight);
const point = new obelisk.Point(worldWidth / 2, worldHeight / 2);
const pixelView = new obelisk.PixelView(canvas, point);

// create cube dimension and color instance
const dimension = new obelisk.CubeDimension(pixelWidth, pixelHeight, pixelDepth);

// Start drawing
const halfHeight = worldHeight / 2;
const halfWidth = worldWidth / 2;
for (let i = -halfWidth; i < halfWidth; i += pixelWidth) {
    for (let j = -halfHeight; j < halfHeight; j += pixelHeight) {
        // center of pixel
        const x = i + pixelWidth / 2;
        const y = j + pixelHeight / 2;
        if (isInCircle(x,y) && !isInPlayTriangle(x,y)) {
            const color = getColor(x,y);
            //const color = new obelisk.CubeColor().getByHorizontalColor(color);
            const cubeColor = new obelisk.CubeColor(
                obelisk.ColorGeom.applyBrightness(color, -80),      // border
                obelisk.ColorGeom.applyBrightness(color, 0, false),  // border highlight
                obelisk.ColorGeom.applyBrightness(color, -40),      // left
                obelisk.ColorGeom.applyBrightness(color, -20),      // right
                color                                       // top
            );

            // build cube with dimension and color instance
            const cube = new obelisk.Cube(dimension, cubeColor, true);

            const pixelPoint = new obelisk.Point3D(i, j, 0);
            pixelView.renderObject(cube, pixelPoint);
        }
    }
}

canvas.createPNGStream().pipe(fs.createWriteStream('./figure.png'));