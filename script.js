// grid panning/zooming based on: https://stackoverflow.com/a/53329817/16158590

import { parseTex } from "./libraries/latex2math/index.js"
const MQ = MathQuill.getInterface(2);

const defaultLabelFontSize = 24;
const defaultPointRadius = 9;
const defaultDomainStart = 0;
const defaultDomainEnd = 2 * Math.PI;
const defaultSteps = 1000;
const defaultAnimTime = 10; // seconds to finish drawing a graph
var currentAnimTime = defaultAnimTime;

const colors = ["#8B0000", "#b56d00", "#ffc400", "#a39e00", "#00dd00", "#008000", "#00bbff", "#0000ff", "#990299", "#ff00ff"]
const criticalAngles = [
    {
        value: 0,
        axis: true,
    },
    {
        value: Math.PI / 2,
        denominator: 2,
        axis: true,
    },
    {
        value: Math.PI,
        axis: true,
    },
    {
        value: 3 * Math.PI / 2,
        numerator: 3,
        denominator: 2,
        axis: true,
    },
    {
        value: Math.PI / 6,
        denominator: 6,
    },
    {
        value: Math.PI / 4,
        denominator: 4,
    },
    {
        value: Math.PI / 3,
        denominator: 3,
    },
    {
        value: 2 * Math.PI / 3,
        numerator: 2,
        denominator: 3,
    },
    {
        value: 3 * Math.PI / 4,
        numerator: 3,
        denominator: 4,
    },
    {
        value: 5 * Math.PI / 6,
        numerator: 5,
        denominator: 6,
    },
    {
        value: 7 * Math.PI / 6,
        numerator: 7,
        denominator: 6,
    },
    {
        value: 5 * Math.PI / 4,
        numerator: 5,
        denominator: 4,
    },
    {
        value: 4 * Math.PI / 3,
        numerator: 4,
        denominator: 3,
    },
    {
        value: 5 * Math.PI / 3,
        numerator: 5,
        denominator: 3,
    },
    {
        value: 7 * Math.PI / 4,
        numerator: 7,
        denominator: 4,
    },
    {
        value: 11 * Math.PI / 6,
        numerator: 11,
        denominator: 6,
    }
]

const tooltip = document.getElementById("coords-tooltip");
const tooltipDummy = document.getElementById("coords-tooltip-dummy");
const equationsContainer = document.getElementById("equations");
const animTimeInput = document.getElementById("animtime-input");
const resetButton = document.getElementById("reset-viewport");
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const font = new FontFace("Inter-Regular", "url(assets/Inter-Regular.ttf)");
font.load().then(f => document.fonts.add(f));

const mouse = { x: 0, y: 0, button: false, wheel: 0, lastX: 0, lastY: 0, drag: false };
const defaultGridSize = 128;  // grid size in screen pixels for adaptive and world pixels for static
const scaleRate = 1.02; // Closer to 1: slower rate of change, less than 1: inverts scaling change and same rule
const minScale = 0.03;
const maxScale = 7;

var pointCursor = false;
const graphs = [];
const mathFields = new Map(); // used for tracking the content of math fields

new jBox("Modal", {
    attach: `#help`,
    title: "Support",
    content: "This graphing calculator was made to help with the visualization of limaçon curves, " +
        "which are graphs in a polar coordinate system of the form <span style='font-style: italic'>r = a sinθ ± b</span>, or <span style='font-style: italic'>r = a cosθ ± b</span>. " +
        "Points on a curve in the polar coordinate system can be difficult to know because one point " +
        "can have different coordinates, so this calculator helps show the correct ones.<br /><br />" +
        "The graphing animation and the point tooltips are features not offered by other well-known calculators such as Desmos, " +
        "which is why I made this website. However, <span style='font-weight: 1000;'>this calculator CANNOT graph other equations - only basic sine and cosine curves.</span> It also can't even do basic algebra. Use Desmos for that." +
        "<h3>Contact</h3>This website was made by Isaac Goldberg. " +
        "If you want to report any bugs in the website or if you have any suggestions for an update, " +
        "join my <i class='fa-brands fa-discord'></i> <a href='https://discord.gg/4qnMU24u4G' target='_blank'>Discord support server</a> to send me a message." + 
        "<h3>Source Code</h3>" +
        "This project is open source under the MIT License and is available at <i class='fa-brands fa-github'></i> <a href='https://github.com/isaac-goldberg/polar-grapher' target='_blank'>this GitHub repository</a>. " +
        "Definitely feel free to make a pull request if you want to make any updates, although the code is a horrible mess, and I probably won't ever refactor it." +
        "<h3>Dependencies</h4>This project wouldn't be possible without the following:<br />" +
        "<a href='http://mathquill.com/' target='_blank'>MathQuill</a><br />" +
        "<a href='https://mathjs.org/' target='_blank'>math.js</a><br />" +
        "<a href='https://github.com/davidtranhq/tex-math-parser' target='_blank'>This person's amazing LaTeX to math.js parser</a><br />" + 
        "<a href='https://stephanwagner.me/jBox' target='_blank'>jBox</a><br />" +
        "<a href='https://jquery.com/' target='_blank'>jQuery</a>",
    addClass: "jBox-custom-modal help-modal",
});

animTimeInput.onchange = () => {
    var previous = currentAnimTime;
    var n;
    try {
        n = parseFloat(animTimeInput.value);
        if (n <= 0 || n >= 1000) throw "invalid"
    } catch {
        n = defaultAnimTime;
    }
    currentAnimTime = n;
    animTimeInput.value = n.toString();
    if (currentAnimTime != previous) {
        for (const graph of graphs) {
            replayGraph(graph);
        }
    }
}

function pointDist(p1, p2) {
    return Math.sqrt(((p2[0] - p1[0]) ** 2) + ((p2[1] - p1[1]) ** 2));
}

function round(n) {
    n = (Math.round(n * 10e8) / 10e8).toPrecision(3);
    if (n == 0) return 0;
    return n;
}

const distBuffer = 28;
const critAngleBuffer = 50;
function pointTooltip() {
    const sf = panZoom.sf();

    var mPos = panZoom.windowToCanvas(mouse.x, mouse.y); // stands for mouse position
    // var mr = pointDist([0, 0], mPos) * sf;
    // var mAngle = Math.atan2(mPos[1], mPos[0]); // stands for mouse angle
    // if (mAngle < 0) mAngle += 2 * Math.PI;

    var color;
    var criticalAngleData = false;
    var closestPoint = false;
    var closestDist = Infinity;
    var closestPoints = [];
    for (const graph of graphs) {
        var possiblePoints = [];

        function validatePoint(point, buffer, critData) {
            if (pointDist(point, mPos) <= buffer * sf) {
                possiblePoints.push(point);

                let dist = pointDist(point, mPos);
                if (dist < closestDist) {
                    closestPoint = point;
                    closestDist = dist;
                    color = graph.color;
                    closestPoints = [];
                    if (!critData) {
                        closestPoints.push([closestPoint[0], closestPoint[1], round(closestPoint[2]), round(closestPoint[3])]);
                    } else {
                        closestPoints.push([closestPoint[0], closestPoint[1], round(critData.r), round(critData.angle)]);

                        criticalAngleData = {
                            value: critData.value,
                            numerator: critData.numerator,
                            denominator: critData.denominator,
                        }
                    }
                    return true;
                }
            }
        }

        for (const point of graph.criticalPoints) {
            if (point.angle > graph.inputReached) continue;
            validatePoint(point.p, critAngleBuffer, point);
        }

        if (!closestPoint) {
            for (const point of graph.renderPoints) {
                validatePoint(point, distBuffer);
            }
        }

        // ------------------------------------------------------
        // DEPRECATED ALTERNATIVE FOR CURVE HOVER CALCULATIONS
        // ------------------------------------------------------
        // var r = evalMath(graph.eval, mAngle);
        // console.log(r, mAngle)
        // var cosx = mPos[0] / Math.sqrt(mPos[0] ** 2 + mPos[1] ** 2);
        // var sinx = mPos[1] / Math.sqrt(mPos[0] ** 2 + mPos[1] ** 2);
        // var cosx = Math.cos(mAngle);
        // var sinx = Math.sin(mAngle);

        // var rx = r * cosx * defaultGridSize; // no sf needed, built-in to r
        // var ry = r * sinx * defaultGridSize; // no sf needed, built-in to r

        // console.log("r diff:", mr - (r * defaultGridSize * sf), "mr:", mr, "r:", r, "mAngle:", mAngle, "cos(x):", cosx, "sin(x):", sinx, "rx:", rx, "ry:", ry);

        // var r2 = evalMath(graph.eval, mPos[0] + Math.PI);
        // if (Math.abs(mr - (r * defaultGridSize * sf)) <= distBuffer * sf) {
        //     color = graph.color;
        //     closestPoint = [rx, ry];
        //     equalPoints.push([r.toPrecision(3), mAngle.toPrecision(3)]);
        // }
        // ------------------------------------------------------
    }

    var toWindow = panZoom.canvasToWindow(closestPoint[0], closestPoint[1]);
    pointCursor = closestPoint ? {
        toWindow,
        color,
        closestPoints,
        criticalAngleData,
    } : false;
}

function mouseEvents(e) {
    if (!canvas.matches("#graph:hover")) {
        pointCursor = false;
        return;
    };
    const bounds = canvas.getBoundingClientRect();
    mouse.x = e.pageX - bounds.left - scrollX;
    mouse.y = e.pageY - bounds.top - scrollY;

    mouse.button = e.type === "mousedown" ? true : e.type === "mouseup" ? false : mouse.button;
    if (e.type === "wheel") {
        mouse.wheel += -e.deltaY;
        e.preventDefault();
    }
    pointTooltip();
}
["mousedown", "mouseup", "mousemove"].forEach(name => document.addEventListener(name, mouseEvents));
document.addEventListener("wheel", mouseEvents, { passive: false });

resetButton.addEventListener("click", () => panZoom.reset());

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
    reset() {
        this.x = getWindowPoleX();
        this.y = getWindowPoleY();
        this.scale = 1;
    },
    apply() { ctx.setTransform(this.scale, 0, 0, this.scale, this.x, this.y) },
    scaleAt(x, y, sc) {  // x & y are screen coords, not world
        if (this.scale * sc > maxScale || this.scale * sc < minScale) return;
        this.scale *= sc;
        this.x = x - (x - this.x) * sc;
        this.y = y - (y - this.y) * sc;
    },
    sf() { // sf stands for scale factor
        return 1 / this.scale;
    },
    polarToRect(...args) {
        const f = (r, t) => [r * Math.cos(t) * defaultGridSize, r * Math.sin(t) * defaultGridSize];
        if (args.length == 1) return f(args[0][0], args[0][1]);
        else return f(args[0], args[1]);
    },
    poleDist() {
        var x = this.x - getWindowPoleX();
        var y = this.y - getWindowPoleY();
        return Math.sqrt((x ** 2) + (y ** 2));
    },
    windowToCanvas(x, y) { // converts a coordinate in the window to the grid canvas
        var sf = panZoom.sf();
        var ratio = window.devicePixelRatio;

        var poleX = getWindowPoleX();
        var poleY = getWindowPoleY();
        var centerX = -(this.x - poleX);
        var centerY = this.y - poleY; // (centerX, centerY) is where screen is centered about

        var pointX = x - (window.innerWidth / 2);
        var pointY = -(y - (window.innerHeight / 2));

        return [(centerX + (pointX * ratio)) * sf, (centerY + (pointY * ratio)) * sf];
    },
    canvasToWindow(x, y) { // inverse of the windowToCanvas function
        var sf = panZoom.sf();
        var ratio = window.devicePixelRatio;

        var poleX = getWindowPoleX();
        var poleY = getWindowPoleY();
        var centerX = -(this.x - poleX);
        var centerY = this.y - poleY;

        var invertedX = ((x / sf) - centerX) / ratio;
        var invertedY = ((y / sf) - centerY) / ratio;

        return [invertedX + (window.innerWidth / 2), -invertedY + (window.innerHeight / 2)];
    }
}
function drawGrid() {
    var scale, gridScale, size, x, y;
    scale = 1 / panZoom.scale;
    gridScale = 2 ** (Math.log2(defaultGridSize * scale) | 0);
    size = Math.max(canvas.width, canvas.height) * scale + gridScale * 2;
    x = ((-panZoom.x * scale - gridScale) / gridScale | 0) * gridScale;
    y = ((-panZoom.y * scale - gridScale) / gridScale | 0) * gridScale;

    const sf = panZoom.sf(); // sf stands for scale factor

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

        var newX = Math.round(Math.abs(xi / defaultGridSize) * 100) / 100;
        var newY = Math.round(Math.abs(yi / defaultGridSize) * 100) / 100;

        // deprecated
        // var yMetrics = ctx.measureText(newY);
        // // vertical lines with fixed gap for x labels
        // ctx.moveTo(xi, y);
        // ctx.lineTo(xi, 5 * sf);
        // ctx.moveTo(xi, 25 * sf);
        // ctx.lineTo(xi, y + size);

        // x labels
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        if (xi == 0) {
            ctx.textAlign = "right"
            ctx.fillText(newX.toString(), xi - (5 * sf), 5 * sf);
        } else {
            ctx.fillText(newX.toString(), xi, 5 * sf);
        }

        // deprecated
        // horizontal grid lines with calculated gap for y labels
        // ctx.moveTo(x, yi);
        // ctx.lineTo(-(yMetrics.width + (7 * sf)), yi);
        // ctx.moveTo(-5 * sf, yi);
        // ctx.lineTo(x + size, yi);

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
    // CRITICAL ANGLE MARKINGS (pi/6, pi/4, pi/3, etc.)
    // ------------------------------------------------------
    panZoom.apply();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#444"
    ctx.beginPath();
    var requiredSize = (size * sf) + (panZoom.poleDist() * (1 / sf));
    for (const angle of criticalAngles) {
        ctx.moveTo(0, 0);
        ctx.lineTo(requiredSize * Math.cos(angle.value), requiredSize * Math.sin(angle.value));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    ctx.stroke();
    ctx.closePath();
    // ------------------------------------------------------



    // ------------------------------------------------------
    // HALFWAY GRID LINES (deprecated)
    // ------------------------------------------------------
    // panZoom.apply();
    // ctx.lineWidth = 0.5;
    // ctx.strokeStyle = "#999"
    // ctx.beginPath();
    // for (let i = 0; i < size; i += gridScale) {
    //     var xi = x + i + (gridScale / 2);
    //     var yi = y + i + (gridScale / 2);

    //     ctx.moveTo(xi, y);
    //     ctx.lineTo(xi, y + size);

    //     ctx.moveTo(x, yi);
    //     ctx.lineTo(x + size, yi);
    // }
    // ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is proportional
    // ctx.stroke();
    // ------------------------------------------------------



    // ------------------------------------------------------
    // RADIAL GRID LINES
    // ------------------------------------------------------
    panZoom.apply();
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    var radialSize = (size * sf) + (panZoom.poleDist() * (1 / sf));
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



    // ------------------------------------------------------
    // RENDER CURVES IN WORKSPACE
    // ------------------------------------------------------
    ctx.lineWidth = 3.25;
    graphs.forEach((graph) => {
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
                    ctx.arc(p1[0], -p1[1], 8 * sf, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.closePath();
                }
                break;
            }

            var p2 = graph.renderPoints[i + 1];
            ctx.moveTo(p1[0], -p1[1]);
            ctx.lineTo(p2[0], -p2[1]);
        }
    });
    // ------------------------------------------------------



    // ------------------------------------------------------
    // IF MOUSE IS HOVERING OVER A CURVE
    // ------------------------------------------------------
    if (pointCursor) {
        var div = document.createElement("div");

        var spanElem = document.createElement("span");
        var r;
        if (pointCursor.criticalAngleData) {
            addTooltipClass("critical");
            if (pointCursor.criticalAngleData.value == 0) r = "0"
            else r = ""
        } else {
            r = pointCursor.closestPoints[0][3];
            removeTooltipClass("critical");
        }
        spanElem.innerHTML = `${pointCursor.closestPoints[0][2]}, ${r}`
        div.appendChild(spanElem);

        if (pointCursor.criticalAngleData && r == "") {
            var mathElem = document.createElement("span");
            mathElem.classList.add("math-span");
            if (!pointCursor.criticalAngleData.denominator) {
                removeTooltipClass("with-denominator");
                mathElem.innerHTML = String.raw`${pointCursor.criticalAngleData.numerator || ""}\pi`
            } else {
                addTooltipClass("with-denominator");
                mathElem.innerHTML = String.raw`\frac{${pointCursor.criticalAngleData.numerator || ""}\pi}{${pointCursor.criticalAngleData.denominator}}`
            }
            MQ.StaticMath(mathElem);
            div.appendChild(mathElem);

            addTooltipClass("with-math");
        } else {
            removeTooltipClass("with-math");
            removeTooltipClass("with-denominator");
        }

        tooltipDummy.replaceChildren(div);

        var width = tooltipDummy.clientWidth;
        var height = tooltipDummy.clientHeight;

        var newX = pointCursor.toWindow[0] - (width / 2);
        if (newX + width + 10 >= window.innerWidth) newX -= (newX + width + 10) - window.innerWidth;
        if (newX - 10 <= 0) newX = 10;

        var newY;
        var yStart = pointCursor.toWindow[1];
        var yDiff = (15 + height + 3);
        if (yStart - yDiff >= 0) newY = yStart - yDiff;
        else newY = yStart + 15;

        $(tooltip).css({
            opacity: 0.85,
            left: newX,
            top: newY,
            width,
            height,
        });
        tooltip.replaceChildren(div);

        // cursor point on curve
        panZoom.apply();
        ctx.fillStyle = pointCursor.color;
        ctx.beginPath();
        ctx.arc(pointCursor.closestPoints[0][0], -pointCursor.closestPoints[0][1], defaultPointRadius * sf, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
    } else {
        tooltip.style.opacity = 0;
    }
    // ------------------------------------------------------

    // DEPRECATED: plotting individual points on the graph
    // ctx.fillStyle = "#000"
    // ctx.fillRect(pointCursor.x - (75 * sf), pointCursor.y - (50 * sf), 150 * sf, 40 * sf);

    // ctx.fillStyle = "#fff"
    // ctx.textAlign = "center"
    // let i = 0;
    // for (const point of pointCursor.equalPoints) {
    //     ctx.fillText(`(${point[0]}, ${point[1]})`, pointCursor.x, pointCursor.y - (28 * sf) - (i * 15 * sf));
    //     i++;
    // }
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
            var poleX = getWindowPoleX();
            var poleY = getWindowPoleY();
            var newX = panZoom.x + (mouse.x - mouse.lastX) * ratio;
            var newY = panZoom.y + (mouse.y - mouse.lastY) * ratio;
            if (Math.abs(newX - poleX) < 1000 || (Math.abs(newX) < Math.abs(mouse.x))) {
                panZoom.x = newX;
            }
            if (Math.abs(newY - poleY) < 1000 || (Math.abs(newY) < Math.abs(mouse.y))) {
                panZoom.y = newY;
            }
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

function addTooltipClass(name) {
    tooltipDummy.classList.add(name);
    tooltip.classList.add(name);
}

function removeTooltipClass(name) {
    tooltipDummy.classList.remove(name);
    tooltip.classList.remove(name);
}

function replayGraph(graph) {
    graph.animDone = false;
    graph.renderPoints = [];
    graph.animStart = performance.now();
}

function animateGraphs(timestamp) {
    graphs.forEach((graph) => {
        if (graph.animDone) return;
        var totalPoints = graph.allPoints.length;

        var elapsedSeconds = (timestamp - graph.animStart) / 1000;
        var percentage = elapsedSeconds / currentAnimTime;
        var renderedPoints = totalPoints * percentage;

        graph.renderPoints = graph.allPoints.slice(0, renderedPoints);
        if (graph.renderPoints.length == 0) graph.inputReached = 0;
        else graph.inputReached = graph.renderPoints[graph.renderPoints.length - 1][3];
        if (renderedPoints >= totalPoints) graph.animDone = true;
    });
}

function evalMath(f, x) {
    try {
        return f.evaluate({ x });
    } catch {
        return false;
    }
}

const warningDebounce = 2000;
var lastWarning = 0;
function addGraph(id, func, color) {
    var f;
    try {
        var node = parseTex(func);
        f = node.compile();
    } catch (e) {
        return false;
    }

    const sf = panZoom.sf(); // sf stands for scale factor

    var step = (defaultDomainEnd - defaultDomainStart) / defaultSteps * sf;
    const allPoints = [];
    let prevR;
    var asymptote = false;
    for (let angle = defaultDomainStart; angle <= defaultDomainEnd; angle += step) {
        var r = evalMath(f, angle);
        if (!r) continue;
        var p = [...panZoom.polarToRect([r, angle]), r, angle];

        // primitive asymptote detection
        if (r < 0 && prevR > 0 && Math.abs(r - prevR) > 100) asymptote = true;
        else if (r > 0 && prevR < 0 && Math.abs(r - prevR) > 100) asymptote = true;
        if (asymptote) {
            var t = performance.now();
            if (t - lastWarning > warningDebounce) {
                sendNotice("Sorry, that type of equation isn't supported.", "yellow");
                lastWarning = t;
            }
            return false;
        }
        prevR = r;

        allPoints.push(p);
    }
    
    if (allPoints.length == 0) return false;

    const criticalPoints = [];
    for (var critAngle of criticalAngles) {
        var angle = critAngle.value;
        var r = evalMath(f, angle);
        if (!r) continue;
        var p = panZoom.polarToRect([r, angle]);
        criticalPoints.push({
            p,
            r,
            angle,
            value: critAngle.value,
            numerator: critAngle.numerator,
            denominator: critAngle.denominator,
        });
    }

    var obj = {
        id,
        func,
        eval: f,
        color,
        criticalPoints,
        allPoints,
        renderPoints: [],
        inputReached: 0,
        animStart: performance.now(),
        animDone: false,
    }

    graphs.push(obj);
    return obj;
}

function randomColor() {
    const c = () => colors[Math.floor(Math.random() * colors.length)];

    var color = c();
    while (graphs.find(g => g.color == color) && graphs.length < colors.length) {
        color = c();
    }
    return color;
}

function uid() {
    return Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9 * Math.pow(10, 12)).toString(36);
}

function createIconButton(title, iconClasses, containerClasses) {
    const div = document.createElement("div");
    div.classList.add("icon-container", "tooltip");
    if (containerClasses) div.classList.add(...containerClasses.split(/ /gmi));
    div.title = title;
    const icon = document.createElement("i");
    icon.classList.add(...iconClasses.split(/ /gmi));
    div.appendChild(icon);

    return div;
}

var lastJbox;
function addInputField(addDefaultEquation, halfReveal, referenceElem) {
    const id = uid();
    var currentColor;

    mathFields.set(id, "");

    const div = document.createElement("div");
    div.id = id + "-container";
    div.classList.add("equation");
    if (halfReveal) div.classList.add("half-reveal");

    const rSpan = document.createElement("span");
    rSpan.classList.add("r");
    rSpan.innerHTML = "r ="

    const inputSpan = document.createElement("span");
    inputSpan.classList.add("mathinput");
    inputSpan.id = id + "-span";

    const colorDiv = createIconButton("Color", "fa-solid fa-palette", "palette bob");
    const refreshDiv = createIconButton("Replay", "fa-solid fa-arrow-rotate-right", "spin");
    const finishDiv = createIconButton("Finish", "fa-solid fa-flag-checkered", "flag");
    const trashDiv = createIconButton("Delete", "fa-solid fa-trash-can", "trash bob");
    colorDiv.id = `${id}-color-div`

    div.appendChild(rSpan);
    div.appendChild(inputSpan);

    div.appendChild(colorDiv);
    div.appendChild(refreshDiv);
    div.appendChild(finishDiv);
    div.appendChild(trashDiv);

    if (referenceElem) equationsContainer.insertBefore(div, referenceElem.nextSibling);
    else equationsContainer.appendChild(div);

    function unreveal() {
        div.classList.remove("half-reveal");
        addInputField(false, true);
    }

    if (halfReveal) {
        const onclick = () => {
            if (!div.classList.contains("half-reveal")) return;
            unreveal();
            div.removeEventListener("click", onclick);
        }
        div.addEventListener("click", onclick);
    }

    // deletes the current math field and focuses the previous one
    function deleteField(mathField) {
        if (!div.previousSibling) { // don't remove if this is the first equation
            mathField.latex("");
            return;
        };
        const previousField = div.previousSibling.querySelector(".mathinput");
        div.remove();
        colorModalContainer.remove();
        colorModal.destroy();
        lastJbox?.destroy();
        if (previousField) {
            const previousMathField = MQ(previousField);
            previousMathField.focus();
        }
        mathFields.delete(id);
    }

    var jDiv = $(div);
    var jSpan = $(inputSpan);
    jSpan.css("border-color", "var(--color)");

    const formatUpdateDelay = 4000;
    var lastTimeoutId;
    var lastInputTime = 0;

    var mathField = MQ.MathField(inputSpan, {
        spaceBehavesLikeTab: true,
        handlers: {
            edit: () => {
                if (div.classList.contains("half-reveal")) unreveal();
                var oldFieldValue = mathFields.get(id);
                var raw = String.raw`${mathField.latex()}`

                // function cursorBack() {
                //     var customKeyDownEvent = $.Event('keydown');

                //     // 37 for left arrow key, 39 for right arrow key
                //     customKeyDownEvent.bubbles = true;
                //     customKeyDownEvent.cancelable = true;
                //     customKeyDownEvent.charCode = 37;
                //     customKeyDownEvent.keyCode = 37;   
                //     customKeyDownEvent.which = 37;

                //     $(`#${id}-span textarea`).trigger(customKeyDownEvent);
                // }

                function transmitGraph(rawEquation) {
                    var color = currentColor || randomColor();
                    var isValid = addGraph(id, rawEquation.replace(/\\theta/gmi, " x").replace(/θ/gmi, " x"), color);
                    changeFieldColor(color);
                    if (!currentColor) currentColor = color;
                    if (!isValid) {
                        div.classList.add("error");
                    } else {
                        div.classList.remove("error");
                    }
                }

                function formatUpdate() {
                    var newLatex = raw.replace(/\s?x/gmi, "θ"); // .replace(/(?<!\\)pi/gmi, String.raw`\pi`)
                    if (newLatex == oldFieldValue) return;
                    mathFields.set(id, newLatex);
                    mathField.latex(newLatex);
                    var newRaw = mathField.latex();
                    if (newRaw.length == 0) return;
                    if (!graphs.find(g => g.id == id)) transmitGraph(String.raw`${newRaw}`);
                }

                lastInputTime = performance.now();
                if (lastTimeoutId) clearTimeout(lastTimeoutId);
                lastTimeoutId = setTimeout(() => {
                    if (performance.now() - lastInputTime < formatUpdateDelay) return;
                    formatUpdate();
                }, formatUpdateDelay)

                // if (raw.length > oldFieldValue.length || (raw.length == oldFieldValue.length && raw != oldFieldValue)) {
                // if (/(?<!\\)pi/gmi.exec(raw) != null) {
                //     mathField.latex(raw.replace(/(?<!\\)pi/gmi, String.raw`\pi`));
                //     if (!mathField.latex().endsWith("pi")) cursorBack();
                // } else if (/cos$/gmi.exec(raw) != null || /sin$/gmi.exec(raw) != null) {
                //     mathField.cmd("(");
                // } else if (/(?<!\\)sqrt$/gmi.exec(raw) != null) {
                //     mathField.latex(String.raw`${raw.slice(0, -4)}\sqrt{ }`);
                //     cursorBack();
                // } else if (raw.includes("x")) {
                //     mathField.latex(raw.replace(/x/gm, "θ"));
                //     if (!mathField.latex().endsWith("θ")) cursorBack();
                // }

                // raw = mathField.latex();
                // }

                if (equationsContainer.childNodes.length > 2) {
                    // check if backspace was pressed when field was empty
                    if (oldFieldValue == "" && raw == "") return deleteField();
                }

                if (oldFieldValue == raw && graphs.find(g => g.id == id)) return;

                let i = 0;
                graphs.find(g => {
                    if (g.id == id) return true;
                    i++;
                    return false;
                });

                // if this math field is being graphed, delete it
                if (i < graphs.length) graphs.splice(i, 1);

                mathFields.set(id, raw);
                if (raw != "") {
                    colorModal.enable();
                    transmitGraph(raw);
                } else {
                    div.classList.remove("error");
                    colorModal.disable();
                    currentColor = false;
                    changeFieldColor("");
                }
            },
            enter: () => {
                // enter key pressed
                addInputField(false, false, div);
            }
        }
    });

    function changeColor(c) {
        currentColor = c;
        colorModal.close();
        var graph = graphs.find(g => g.id == id);
        if (!graph) return;
        graph.color = c;
        changeFieldColor(c);
    }

    var colorModalContainer = document.createElement("div");
    colorModalContainer.style.display = "none"
    var colorModalInner = document.createElement("div");
    colorModalInner.classList.add("color-modal");
    for (const c of colors) {
        var cContainer = document.createElement("div");
        cContainer.classList.add("color-container");
        var cDiv = document.createElement("div");
        cDiv.classList.add("color-inner")
        cDiv.style.height = "25px"
        cDiv.style.width = "25px"
        cDiv.style.backgroundColor = c;

        cDiv.addEventListener("click", () => {
            changeColor(c);
        });

        cContainer.appendChild(cDiv)
        colorModalInner.appendChild(cContainer);
    }
    var pickerTitle = document.createElement("p");
    pickerTitle.classList.add("color-picker-title");
    pickerTitle.innerHTML = "Custom Color"
    var pickerDiv = document.createElement("div");
    pickerDiv.classList.add("color-picker-container");
    var pickerInner = document.createElement("div");
    pickerInner.classList.add("color-picker-inner");
    var pickerIcon = document.createElement("i");
    pickerIcon.classList.add("fa-solid", "fa-pencil", "color-picker-icon");
    var picker = document.createElement("input");
    picker.classList.add("color-picker");
    picker.type = "color"
    picker.value = currentColor;
    picker.addEventListener("change", () => {
        changeColor(picker.value);
    });
    pickerInner.appendChild(pickerIcon);
    pickerInner.appendChild(picker);
    pickerDiv.appendChild(pickerInner);

    const changeF = () => {
        pickerInner.style.backgroundColor = picker.value;
    }
    picker.onchange = changeF;
    picker.oninput = changeF;

    pickerInner.style.backgroundColor = picker.value;

    colorModalContainer.appendChild(colorModalInner);
    colorModalContainer.appendChild(pickerTitle);
    colorModalContainer.appendChild(pickerDiv);

    var colorModal = new jBox("Modal", {
        attach: `#${id}-color-div`,
        title: "Change Curve Color",
        content: $(colorModalContainer),
        addClass: "jBox-custom-modal",
    });
    colorModal.disable();

    function changeFieldColor(color) {
        jDiv.css("--color", color);
        picker.value = color;
        pickerInner.style.backgroundColor = color;
    }

    setTimeout(() => {
        colorDiv.addEventListener("click", () => {
            if (div.classList.contains("half-reveal")) return;
            var graph = graphs.find(g => g.id == id);
            if (!graph) return sendNotice("That equation isn't currently being graphed!", "red");
        });

        refreshDiv.addEventListener("click", () => {
            if (div.classList.contains("half-reveal")) return;
            var graph = graphs.find(g => g.id == id);
            if (!graph) return sendNotice("That equation isn't currently being graphed!", "red");
            replayGraph(graph);
        });

        finishDiv.addEventListener("click", () => {
            if (div.classList.contains("half-reveal")) return;
            var graph = graphs.find(g => g.id == id);
            if (!graph) return sendNotice("That equation isn't currently being graphed!", "red");
            graph.animDone = true;
            graph.renderPoints = graph.allPoints;
        });

        trashDiv.addEventListener("click", () => {
            if (div.classList.contains("half-reveal")) return;
            deleteField(mathField);
            var found = false;
            var i = 0;
            for (i = 0; i < graphs.length; i++) {
                if (graphs[i].id == id) {
                    found = true;
                    break;
                }
            }
            if (found) graphs.splice(i, 1);
        });
    }, (1));

    if (addDefaultEquation) mathField.latex(String.raw`5\sin\left(3θ\right)`);

    if (!halfReveal) mathField.focus();

    // jBox integration
    if (lastJbox) lastJbox.destroy();
    lastJbox = new jBox("Tooltip", {
        attach: ".tooltip",
        pointer: false,
        offset: { y: -5 },
        theme: "TooltipDark",
        fade: 100,
        animation: "zoomIn",
        addClass: "jBox-custom-tooltip",
        overlayClass: "jbox-overlay-custom",
    });
}

function sendNotice(content, color) {
    new jBox("Notice", {
        content,
        color,
        showCountdown: true,
        delayOnHover: true,
        addClass: "jBox-custom-notice",
    });
}

addInputField(true);
addInputField(false, true);

window.requestAnimationFrame(update);