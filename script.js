// const max = 100;
// const canvas = document.getElementById("graph");
// const ctx = canvas.getContext("2d");

// function init() {
//     canvas.width = 1000;
//     canvas.height = 1000;
//     ctx.translate(canvas.width / 2, canvas.height / 2);

//     window.requestAnimationFrame(draw);
// }

// var lastCoords = { x: 0, y: 0 };

// function draw() {
//     var { x, y } = lastCoords;

//     ctx.beginPath();
//     ctx.moveTo(x, y);
//     ctx.lineTo(x + 1, y + 1);
//     ctx.stroke();
//     ctx.closePath();

//     lastCoords.x += 1;
//     lastCoords.y += 1;

//     if (x < max) window.requestAnimationFrame(draw);
// }

// init();


//////////////////////
// taken from: https://stackoverflow.com/a/53329817/16158590

const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const font = new FontFace("Inter-Regular", "url(assets/Inter-Regular.ttf)");
font.load().then(f => document.fonts.add(f));

requestAnimationFrame(update);
const mouse = { x: 0, y: 0, button: false, wheel: 0, lastX: 0, lastY: 0, drag: false };
const gridLimit = 64;  // max grid lines for static grid
const defaultGridSize = 128;  // grid size in screen pixels for adaptive and world pixels for static
const scaleRate = 1.005; // Closer to 1: slower rate of change, less than 1: inverts scaling change and same rule

const defaultLabelFontSize = 20;
const defaultPointRadius = 5;

const points = [[1, 1]];

function mouseEvents(e) {
    const bounds = canvas.getBoundingClientRect();
    mouse.x = e.pageX - bounds.left - scrollX;
    mouse.y = e.pageY - bounds.top - scrollY;
    
    mouse.button = e.type === "mousedown" ? true : e.type === "mouseup" ? false : mouse.button;
    if (e.type === "wheel") {
        mouse.wheel += -e.deltaY;
        e.preventDefault();
    }
}
["mousedown", "mouseup", "mousemove"].forEach(name => document.addEventListener(name, mouseEvents));
document.addEventListener("wheel", mouseEvents, { passive: false });

const panZoom = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    scale: 1,
    apply() { ctx.setTransform(this.scale, 0, 0, this.scale, this.x, this.y) },
    scaleAt(x, y, sc) {  // x & y are screen coords, not world
        this.scale *= sc;
        this.x = x - (x - this.x) * sc;
        this.y = y - (y - this.y) * sc;
    },
    toWorld(...args) {
        function f(x, y) {
            return [x * 128, y * -128];
        }
        if (args.length == 1) return f(args[0][0], args[0][1]);
        else return f(args[0], args[1]);
    }
}
function drawGrid(gridScreenSize) {
    var scale, gridScale, size, x, y;
    scale = 1 / panZoom.scale;
    gridScale = 2 ** (Math.log2(gridScreenSize * scale) | 0);
    size = Math.max(w, h) * scale + gridScale * 2;
    x = ((-panZoom.x * scale - gridScale) / gridScale | 0) * gridScale;
    y = ((-panZoom.y * scale - gridScale) / gridScale | 0) * gridScale;

    const sf = scaleRate / panZoom.scale; // sf stands for scale factor
    
    // ------------------------------------------------------
    // MAIN GRID LINES
    // ------------------------------------------------------
    panZoom.apply();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#444"
    ctx.fillStyle = "#000"
    ctx.font = `${defaultLabelFontSize * sf}px 'Inter-Regular'`
    ctx.beginPath();
    for (i = 0; i < size; i += gridScale) {
        var xi = x + i;
        var yi = y + i;
        var newX = Math.round(Math.abs(xi / defaultGridSize) * 100) / 100;
        var newY = Math.round(Math.abs(yi / defaultGridSize) * 100) / 100;
        var yMetrics = ctx.measureText(newY);
        
        // vertical lines with fixed gap for x labels
        ctx.moveTo(xi, y);
        ctx.lineTo(xi, 5 * sf);
        ctx.moveTo(xi, 25 * sf);
        ctx.lineTo(xi, y + size);

        // x labels
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        if (xi == 0) {
            ctx.textAlign = "right"
            ctx.fillText(newX.toString(), xi - (5 * sf), 5 * sf);
        } else {
            ctx.fillText(newX.toString(), xi, 5 * sf);
        }

        // horizontal grid lines with calculated gap for y labels
        ctx.moveTo(x, yi);
        ctx.lineTo(-(yMetrics.width + (7 * sf)), yi);
        ctx.moveTo(-5 * sf, yi);
        ctx.lineTo(x + size, yi);

        // y labels
        if (yi == 0) continue;
        ctx.textAlign = "right"
        ctx.textBaseline = "middle"
        ctx.fillStyle = "#000"
        ctx.fillText(newY.toString(), -5 * sf, yi);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    ctx.stroke();
    ctx.closePath();
    // ------------------------------------------------------



    // ------------------------------------------------------
    // HALFWAY GRID LINES
    // ------------------------------------------------------
    panZoom.apply();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "#999"
    ctx.beginPath();
    for (i = 0; i < size; i += gridScale) {
        var xi = x + i + (gridScale / 2);
        var yi = y + i + (gridScale / 2);
        
        ctx.moveTo(xi, y);
        ctx.lineTo(xi, y + size);

        ctx.moveTo(x, yi);
        ctx.lineTo(x + size, yi);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    ctx.stroke();
    // ------------------------------------------------------



    // ------------------------------------------------------
    // X AND Y AXES
    // ------------------------------------------------------
    panZoom.apply()
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000"
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(0, y + size);
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    ctx.stroke();
    ctx.closePath();
    // ------------------------------------------------------



    info.textContent = "Scale: 1px = " + (1 / panZoom.scale).toFixed(4) + " world px ";

    // draw points
    panZoom.apply();
    for (const point of points) {
        var p = panZoom.toWorld(point);
        ctx.beginPath();
        ctx.arc(p[0], p[1], defaultPointRadius * sf, 0, 2 * Math.PI);
        ctx.fill();

        ctx.closePath();
    }
}

var w = canvas.width;
var h = canvas.height;
function update() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.globalAlpha = 1;           // reset alpha
    if (w !== innerWidth || h !== innerHeight) {
        w = canvas.width = innerWidth;
        h = canvas.height = innerHeight;
    } else {
        ctx.clearRect(0, 0, w, h);
    }
    if (mouse.wheel !== 0) {
        let scale = 1;
        scale = mouse.wheel < 0 ? 1 / scaleRate : scaleRate;
        mouse.wheel *= 0.8;
        if (Math.abs(mouse.wheel) < 1) {
            mouse.wheel = 0;
        }
        panZoom.scaleAt(mouse.x, mouse.y, scale); //scale is the change in scale
    }
    if (mouse.button) {
        if (!mouse.drag) {
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
            mouse.drag = true;
        } else {
            panZoom.x += mouse.x - mouse.lastX;
            panZoom.y += mouse.y - mouse.lastY;
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
        }
    } else if (mouse.drag) {
        mouse.drag = false;
    }
    drawGrid(defaultGridSize);
    requestAnimationFrame(update);
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }