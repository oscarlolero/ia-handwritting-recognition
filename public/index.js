
// Variables for referencing the canvas and 2dcanvas context
let canvas, ctx =[];

// Variables to keep track of the mouse position and left-button status
let mouseX, mouseY, mouseDown = 0;

// Draws a dot at a specific position on the supplied canvas name
// Parameters are: A canvas context, the x position, the y position, the size of the dot
function drawDot(ctx, x, y) {
    let pxData = ctx.getImageData(x, y, 28, 28);
    pxData.data[0] = 0;
    pxData.data[1] = 0;
    pxData.data[2] = 0;
    pxData.data[3] = 255;
    ctx.putImageData(pxData, x, y);
}

// Clear the canvas context using the canvas width and height
function clearCanvas(ctx) {
    ctx.clearRect(0, 0, 28, 28);
}

// Keep track of the mouse button being pressed and draw a dot at current location
function sketchpad_mouseDown(e) {
    mouseDown = 1;
    drawDot(ctx[e.path[0].dataset.id], mouseX, mouseY);
}

// Keep track of the mouse button being released
function sketchpad_mouseUp() {
    mouseDown = 0;
}

// Keep track of the mouse position and draw a dot if mouse button is currently pressed
function sketchpad_mouseMove(e) {
    // Update the mouse co-ordinates when moved
    getMousePos(e);
    // Draw a dot if the mouse button is currently being pressed
    if (mouseDown === 1) {
        drawDot(ctx[e.path[0].dataset.id], mouseX, mouseY);
    }
}

// Get the current mouse position relative to the top-left of the canvas
function getMousePos(e) {
    if (!e)
        var e = event;

    if (e.offsetX) {
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    } else if (e.layerX) {
        mouseX = e.layerX;
        mouseY = e.layerY;
    }
}

// Set-up the canvas and add our event handlers after the page has loaded
function init() {
    // Get the specific canvas element from the HTML document
    //canvas = document.getElementById('sketchpad');
    canvas = Array.from(document.getElementsByClassName('sketchpad'));

    // If the browser supports the canvas tag, get the 2d drawing context for this canvas
    //if (canvas.getContext)
      //  ctx = canvas.getContext('2d');
    canvas.forEach((element,index) => {
        ctx.push(element.getContext('2d'));
        element.addEventListener('mousedown', sketchpad_mouseDown, false);
        element.addEventListener('mousemove', sketchpad_mouseMove, false);
    });
    window.addEventListener('mouseup', sketchpad_mouseUp, false);

    // Check that we have a valid context to draw on/with before adding event handlers
    // if (ctx) {
    //     canvas.addEventListener('mousedown', sketchpad_mouseDown, false);
    //     canvas.addEventListener('mousemove', sketchpad_mouseMove, false);
    //     window.addEventListener('mouseup', sketchpad_mouseUp, false);
    // }

}

function exportData() {
    let data = [];
    ctx.forEach((element) => {
        data.push(element.getImageData(0,0,28,28).data);
    });

    let finalData = data.map((element) => {
        let tempData = [];
        for (let i = 3; i < element.length; i=i+4) {
            tempData.push(element[i]);
        }
        return tempData;
    });
    console.log(finalData);
}