// grid panning/zooming based on: https://stackoverflow.com/a/53329817/16158590

import { parseTex } from "./libraries/latex2math/index.js"
const MQ = MathQuill.getInterface(2);

const defaultLabelFontSize = 24;
const defaultPointRadius = 7;
const defaultDomainStart = 0;
const defaultDomainEnd = 2 * Math.PI;
const defaultSteps = 1000;
const defaultAnimTime = 1.5; // seconds to finish drawing a graph

const colors = ["#f00", "#008000", "#00f", "#FFA500", "#990299", "#f0f", "#8B0000", "#00bbff", "#0d0", "#a39e00"]

const tooltip = document.getElementById("coords-tooltip");
const tooltipDummy = document.getElementById("coords-tooltip-dummy");
const equationsContainer = document.getElementById("equations");
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const font = new FontFace("Inter-Regular", "url(assets/Inter-Regular.ttf)");
font.load().then(f => document.fonts.add(f));

const mouse = { x: 0, y: 0, button: false, wheel: 0, lastX: 0, lastY: 0, drag: false };
const defaultGridSize = 128;  // grid size in screen pixels for adaptive and world pixels for static
const scaleRate = 1.02; // Closer to 1: slower rate of change, less than 1: inverts scaling change and same rule
const minScale = 0.012;
const maxScale = 200;

var pointCursor = false;
const graphs = [];
const mathFields = new Map(); // used for tracking the content of math fields

function pointDist(p1, p2) {
    return Math.sqrt(((p2[0] - p1[0]) ** 2) + ((p2[1] - p1[1]) ** 2));
}

const distBuffer = 28;
function pointsTooltip() {
    const sf = panZoom.sf();

    var mPos = panZoom.windowToCanvas(mouse.x, mouse.y);
    // console.log("start:", [mouse.x, mouse.y], "canvas:", mPos, "window:", panZoom.canvasToWindow(mPos[0], mPos[1]));

    console.log(mPos)
    var closestPoint = false;
    var closestDist = Infinity;
    var color;
    var equalPoints = [];
    for (const graph of graphs) {
        if (!graph.animDone) continue;
        var possiblePoints = [];
        for (const point of graph.renderPoints) {
            if (Math.abs(point[0] - mPos[0]) <= distBuffer * sf && Math.abs(point[1] - mPos[1]) <= distBuffer * sf) {
                possiblePoints.push(point);

                let dist = pointDist(point, mPos);
                if (dist < closestDist) {
                    closestPoint = point;
                    closestDist = dist;
                    color = graph.color;
                    equalPoints = [];
                    equalPoints.push([closestPoint[2].toPrecision(3), closestPoint[3].toPrecision(3)]);
                } else if (dist == closestDist) {
                    equalPoints.push([point[2], point[3]]);
                }
            }
        }
    }

    var toWindow = panZoom.canvasToWindow(closestPoint[0], closestPoint[1]);
    pointCursor = closestPoint ? {
        x: closestPoint[0],
        y: -closestPoint[1],
        toWindow,
        color,
        equalPoints,
    } : false;
}

function mouseEvents(e) {
    if (!canvas.matches("#graph:hover")) return;
    const bounds = canvas.getBoundingClientRect();
    mouse.x = e.pageX - bounds.left - scrollX;
    mouse.y = e.pageY - bounds.top - scrollY;
    
    mouse.button = e.type === "mousedown" ? true : e.type === "mouseup" ? false : mouse.button;
    if (e.type === "wheel") {
        mouse.wheel += -e.deltaY;
        e.preventDefault();
    }
    pointsTooltip();
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
    sf() { // sf stands for scale factor
        return scaleRate / this.scale;
    },
    polarToRect(...args) {
        const f = (x, y) => [x * Math.cos(y) * defaultGridSize, x * Math.sin(y) * -defaultGridSize];
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
        console.log(sf)
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

    ctx.lineWidth = 3.25;
    graphs.forEach((graph) => {
        panZoom.apply();
        ctx.strokeStyle = graph.color;
        ctx.beginPath();
        for (let i = 0; i < graph.renderPoints.length; i++) {
            var p1 = graph.renderPoints[i];
            if (p1 == "asymptote") continue;

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
            if (p2 == "asymptote") continue;
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
        }
    });

    // ------------------------------------------------------
    // IF MOUSE IS HOVERING OVER A CURVE
    // ------------------------------------------------------
    if (pointCursor) {
        var html = `<p>${pointCursor.equalPoints[0][0]}, ${pointCursor.equalPoints[0][1]}</p>`

        tooltipDummy.innerHTML = html;

        var width = tooltipDummy.clientWidth;
        var height = tooltipDummy.clientHeight;
        var newX = pointCursor.toWindow[0] - (width / 2);
        var newY = pointCursor.toWindow[1] - 50;
        $(tooltip).css({
            opacity: 1,
            left: newX,
            top: newY,
            width,
            height,
        });
        tooltip.innerHTML = html;
        
        // cursor point on curve
        panZoom.apply();
        ctx.fillStyle = pointCursor.color;
        ctx.beginPath();
        ctx.arc(pointCursor.x, pointCursor.y, defaultPointRadius * sf, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        // ctx.fillStyle = "#000"
        // ctx.fillRect(pointCursor.x - (75 * sf), pointCursor.y - (50 * sf), 150 * sf, 40 * sf);

        // ctx.fillStyle = "#fff"
        // ctx.textAlign = "center"
        // let i = 0;
        // for (const point of pointCursor.equalPoints) {
        //     ctx.fillText(`(${point[0]}, ${point[1]})`, pointCursor.x, pointCursor.y - (28 * sf) - (i * 15 * sf));
        //     i++;
        // }

        
    } else {
        tooltip.style.opacity = 0;
    }
    // ------------------------------------------------------
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
    graphs.forEach((graph) => {
        if (graph.animDone) return;
        var totalPoints = graph.allPoints.length;

        var elapsedSeconds = (timestamp - graph.animStart) / 1000;
        var percentage = elapsedSeconds / defaultAnimTime;
        var renderedPoints = totalPoints * percentage;

        graph.renderPoints = graph.allPoints.slice(0, renderedPoints);
        if (renderedPoints >= totalPoints) graph.animDone = true;
    });
}

function addGraph(id, func, color) {
    var f;
    try {
        var node = parseTex(func);
        f = node.compile();
    } catch (e) {
        // console.error(e);
        return false;
    }

    const sf = panZoom.sf(); // sf stands for scale factor

    var step = (defaultDomainEnd - defaultDomainStart) / defaultSteps * sf;
    const allPoints = [];
    let lastR;
    for (let angle = defaultDomainStart; angle <= defaultDomainEnd; angle += step) {
        var r;
        try {
            r = f.evaluate({ x: angle });
        } catch (e) {
            // console.error(e);
            return false;
        }
        var p = panZoom.polarToRect([r, angle]);

        // primitive asymptote detection
        if (r < 0 && lastR > 0 && Math.abs(r) > lastR) allPoints.push("asymptote");
        else if (r > 0 && lastR < 0 && r > Math.abs(lastR)) allPoints.push("asymptote");
        lastR = r;

        allPoints.push([...p, r, angle]);
    }

    var obj = {
        id,
        func,
        color,
        allPoints,
        renderPoints: [],
        animStart: performance.now(),
        animDone: false,
    }

    graphs.push(obj);
    return obj;
}

function randomColor() {
    const c = () => colors[Math.floor(Math.random() * colors.length)];

    var color = c();
    while (graphs.find(g => g.color == color)) {
        color = c();
    }
    return color;
}

function uid() {
    return Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9*Math.pow(10, 12)).toString(36);
}

function addInputField(halfReveal, referenceElem) {
    const id = uid();

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

    div.appendChild(rSpan);
    div.appendChild(inputSpan);

    if (referenceElem) equationsContainer.insertBefore(div, referenceElem.nextSibling);
    else equationsContainer.appendChild(div);

    function unreveal() {
        div.classList.remove("half-reveal");
        addInputField(true);
    }
    
    if (halfReveal) {
        const onclick = () => {
            if (!div.classList.contains("half-reveal")) return;
            unreveal();
            div.removeEventListener("click", onclick);
        }
        div.addEventListener("click", onclick);
    }

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

                // console.log("edit called", raw)

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

                function formatUpdate() {
                    var newLatex = raw.replace(/(?<!\\)pi/gmi, String.raw`\pi`).replace(/\s?x/gmi, "θ");
                    if (newLatex == oldFieldValue) return;
                    mathFields.set(id, newLatex);
                    mathField.latex(newLatex);
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

                // deletes the current math field and focuses the previous one
                function deleteField() {
                    const previousField = div.previousSibling.querySelector(".mathinput");
                    div.remove();
                    if (previousField) {
                        const previousMathField = MQ(previousField);
                        previousMathField.focus();
                    }
                    mathFields.delete(id);
                }

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
                var jSpan = $(`#${inputSpan.id}`);
                if (raw != "") {
                    var color = jSpan.css("--color");
                    if (!color) color = randomColor();
                    addGraph(id, raw.replace(/\\theta/gmi, " x").replace(/θ/gmi, " x"), color);

                    jSpan.css("border-color", color);
                    jSpan.css("--color", color);
                } else {
                    jSpan.css("border-color", "");
                    jSpan.css("--color", "");
                }
            },
            enter: () => {
                // enter key pressed
                addInputField(false, div);
            }
        }
    });

    if (!halfReveal) mathField.focus();
}

addInputField();
addInputField(true);

window.requestAnimationFrame(update);