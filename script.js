// grid panning/zooming based on: https://stackoverflow.com/a/53329817/16158590

import { parseTex } from "./libraries/latex2math/index.js"

const defaultLabelFontSize = 24;
const defaultPointRadius = 5;
const defaultDomainStart = 0;
const defaultDomainEnd = 2 * Math.PI;
const defaultStep = 0.01;
const defaultAnimTime = 10; // seconds to finish drawing a graph

const colors = ["red", "green", "blue", "orange", "purple", "magenta", "darkred", "#00bbff", "#0d0", "#a39e00"]

const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const font = new FontFace("Inter-Regular", "url(assets/Inter-Regular.ttf)");
font.load().then(f => document.fonts.add(f));

requestAnimationFrame(update);
const mouse = { x: 0, y: 0, button: false, wheel: 0, lastX: 0, lastY: 0, drag: false };
const defaultGridSize = 128;  // grid size in screen pixels for adaptive and world pixels for static
const scaleRate = 1.02; // Closer to 1: slower rate of change, less than 1: inverts scaling change and same rule
const minScale = 0.012;
const maxScale = 200;

const points = [[1, Math.PI / 2]];
const graphs = [];

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

function getWindowPoleX() {
    return window.innerWidth * window.devicePixelRatio * 0.5;
}

function getWindowPoleY() {
    return window.innerHeight * window.devicePixelRatio * 0.5;
}

const panZoom = {
    x: getWindowPoleX(),
    y: getWindowPoleY(),
    scale: 1,
    apply() { ctx.setTransform(this.scale, 0, 0, this.scale, this.x, this.y) },
    scaleAt(x, y, sc) {  // x & y are screen coords, not world
        if (this.scale * sc > maxScale || this.scale * sc < minScale) return;
        this.scale *= sc;
        this.x = x - (x - this.x) * sc;
        this.y = y - (y - this.y) * sc;
    },
    polarToRect(...args) {
        function f(x, y) {
            return [x * Math.cos(y) * defaultGridSize, x * Math.sin(y) * -defaultGridSize];
        }
        if (args.length == 1) return f(args[0][0], args[0][1]);
        else return f(args[0], args[1]);
    },
    poleDist() {
        var x = this.x - getWindowPoleX();
        var y = this.y - getWindowPoleY();
        return Math.sqrt((x ** 2) + (y ** 2));
    }
}
function drawGrid() {
    var scale, gridScale, size, x, y;
    scale = 1 / panZoom.scale;
    gridScale = 2 ** (Math.log2(defaultGridSize * scale) | 0);
    size = Math.max(canvas.width, canvas.height) * scale + gridScale * 2;
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
    for (let i = 0; i < size; i += gridScale) {
        var xi = x + i;
        var yi = y + i;

        var newX = formatLabel(Math.abs(xi / defaultGridSize));
        var newY = formatLabel(Math.abs(yi / defaultGridSize));
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
    for (let i = 0; i < size; i += gridScale) {
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
    // RADIAL GRID LINES
    // ------------------------------------------------------
    panZoom.apply();
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    var radialSize = (size * sf) + panZoom.poleDist();
    for (let i = 0; i < radialSize; i += gridScale) {
        var xi = x + i;
        var yi = y + i;
        ctx.arc(0, 0, Math.abs(xi), 0, 2 * Math.PI);
        ctx.arc(0, 0, Math.abs(yi), 0, 2 * Math.PI);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    ctx.stroke();
    // ------------------------------------------------------



    // ------------------------------------------------------
    // X AND Y AXES
    // ------------------------------------------------------
    panZoom.apply()
    ctx.lineWidth = 3;
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



    // draw points
    panZoom.apply();
    for (const point of points) {
        var p = panZoom.polarToRect(point);
        ctx.beginPath();
        ctx.arc(p[0], p[1], defaultPointRadius * sf, 0, 2 * Math.PI);
        ctx.fill();

        ctx.closePath();
    }

    ctx.lineWidth = 3.25;
    for (const graph of graphs) {
        panZoom.apply();
        ctx.strokeStyle = graph.color;
        ctx.beginPath();
        for (let i = 0; i < graph.renderPoints.length; i++) {
            var p1 = graph.renderPoints[i];

            // if this is the last point on the curve
            if (i == graph.renderPoints.length - 1) {
                ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
                ctx.stroke();
                ctx.closePath();

                // draw cursor at end of curve unless graph is already done
                if (!graph.animDone) {
                    panZoom.apply();
                    ctx.fillStyle = "#000"
                    ctx.beginPath();
                    ctx.arc(p1[0], p1[1], 8 * sf, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.closePath();
                }
                break;
            }

            var p2 = graph.renderPoints[i + 1];
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
        }
    }
}

var w = canvas.width;
var h = canvas.height;
function update(timestamp) {
    var ratio = window.devicePixelRatio;

    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.globalAlpha = 1; // reset alpha
    if (w !== window.innerWidth || h !== window.innerHeight) {
        w = canvas.width = window.innerWidth * ratio;
        h = canvas.height = window.innerHeight * ratio;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
    } else {
        ctx.clearRect(0, 0, w, h);
    }
    if (mouse.wheel !== 0) {
        let scale = 1;
        scale = mouse.wheel < 0 ? 1 / scaleRate : scaleRate;
        mouse.wheel *= 0.4;
        if (Math.abs(mouse.wheel) < 1) {
            mouse.wheel = 0;
        }
        panZoom.scaleAt(mouse.x * ratio, mouse.y * ratio, scale); // scale is the CHANGE in scale
    }
    if (mouse.button) {
        if (!mouse.drag) {
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
            mouse.drag = true;
        } else {
            panZoom.x += (mouse.x - mouse.lastX) * ratio;
            panZoom.y += (mouse.y - mouse.lastY) * ratio;
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
        }
    } else if (mouse.drag) {
        mouse.drag = false;
    }
    drawGrid();
    animateGraphs(timestamp);
    window.requestAnimationFrame(update);
}

function animateGraphs(timestamp) {
    for (var graph of graphs) {
        if (graph.animDone) continue;
        var totalPoints = graph.allPoints.length;

        var elapsedSeconds = (timestamp - graph.animStart) / 1000;
        var percentage = elapsedSeconds / defaultAnimTime;
        var renderedPoints = totalPoints * percentage;

        graph.renderPoints = graph.allPoints.slice(0, renderedPoints);
        if (renderedPoints >= totalPoints.length) graph.animDone = true;
    }
}

function addGraph(func) {
    var f;
    try {
        var node = parseTex(func);
        f = node.compile();
    } catch {
        return;
    }

    const sf = scaleRate / panZoom.scale; // sf stands for scale factor

    const allPoints = [];
    var maxInput = (defaultDomainEnd + (defaultStep * sf));
    for (let angle = defaultDomainStart; angle <= maxInput; angle += defaultStep * sf) {
        var p = panZoom.polarToRect([f.evaluate({ x: angle }), angle]);
        allPoints.push(p);
    }

    var obj = {
        func,
        color: colors[Math.floor(Math.random() * colors.length)],
        allPoints: allPoints,
        renderPoints: [],
        animStart: performance.now(),
        animDone: false,
    }

    graphs.push(obj);
}

function formatLabel(num) {
    return Math.round(num * 100) / 100;
}

addGraph(String.raw`3\cos\left(2x\right)`);
addGraph(String.raw`2\sin\left(3x\right)`);

var span = document.getElementById("equation-1");

var MQ = MathQuill.getInterface(2);
var mathField = MQ.MathField(span, {
    spaceBehavesLikeTab: true,
    handlers: {
        edit: () => {
            console.log(mathField.latex());
        }
    }
})