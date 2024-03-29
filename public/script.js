import {MnistData} from './data.js';

async function showExamples(data) {
    // Create a container in the visor
    const surface =
        tfvis.visor().surface({ name: 'Input Data Examples', tab: 'Input Data'});

    // Get the examples
    const examples = data.nextTestBatch(20);
    const numExamples = examples.xs.shape[0];

    // Create a canvas element to render each example
    for (let i = 0; i < numExamples; i++) {
        const imageTensor = tf.tidy(() => {
            // Reshape the image to 28x28 px
            return examples.xs
                .slice([i, 0], [1, examples.xs.shape[1]])
                .reshape([28, 28, 1]);
        });

        const canvas = document.createElement('canvas');
        canvas.width = 28;
        canvas.height = 28;
        canvas.style = 'margin: 4px;';
        await tf.browser.toPixels(imageTensor, canvas);
        surface.drawArea.appendChild(canvas);

        imageTensor.dispose();
    }
}
let model;
async function run() {
    const data = new MnistData();
    await data.load();
    await showExamples(data);

    model = getModel();
    tfvis.show.modelSummary({name: 'Model Architecture'}, model);

    await train(model, data);
    await showAccuracy(model, data);
    await showConfusion(model, data);
}

function getModel() {
    const model = tf.sequential();

    const IMAGE_WIDTH = 28;
    const IMAGE_HEIGHT = 28;
    const IMAGE_CHANNELS = 1;

    // In the first layer of our convolutional neural network we have
    // to specify the input shape. Then we specify some parameters for
    // the convolution operation that takes place in this layer.
    model.add(tf.layers.conv2d({
        inputShape: [IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS],
        kernelSize: 5,
        filters: 8,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'varianceScaling'
    }));

    // The MaxPooling layer acts as a sort of downsampling using max values
    // in a region instead of averaging.
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));

    // Repeat another conv2d + maxPooling stack.
    // Note that we have more filters in the convolution.
    model.add(tf.layers.conv2d({
        kernelSize: 5,
        filters: 16,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'varianceScaling'
    }));
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));

    // Now we flatten the output from the 2D filters into a 1D vector to prepare
    // it for input into our last layer. This is common practice when feeding
    // higher dimensional data to a final classification output layer.
    model.add(tf.layers.flatten());

    // Our last layer is a dense layer which has 10 output units, one for each
    // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9).
    const NUM_OUTPUT_CLASSES = 10;
    model.add(tf.layers.dense({
        units: NUM_OUTPUT_CLASSES,
        kernelInitializer: 'varianceScaling',
        activation: 'softmax'
    }));


    // Choose an optimizer, loss function and accuracy metric,
    // then compile and return the model
    const optimizer = tf.train.adam();
    model.compile({
        optimizer: optimizer,
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    return model;
}

async function train(model, data) {
    const metrics = ['loss', 'val_loss', 'acc', 'val_acc'];
    const container = {
        name: 'Model Training', styles: { height: '1000px' }
    };
    const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);

    const BATCH_SIZE = 512;
    const TRAIN_DATA_SIZE = 55000;
    const TEST_DATA_SIZE = 10000;
    // const TRAIN_DATA_SIZE = 5500;
    // const TEST_DATA_SIZE = 1000;

    const [trainXs, trainYs] = tf.tidy(() => {
        const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
        return [
            d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]),
            d.labels
        ];
    });

    const [testXs, testYs] = tf.tidy(() => {
        const d = data.nextTestBatch(TEST_DATA_SIZE);
        return [
            d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]),
            d.labels
        ];
    });

    return model.fit(trainXs, trainYs, {
        batchSize: BATCH_SIZE,
        validationData: [testXs, testYs],
        epochs: 10,
        shuffle: true,
        callbacks: fitCallbacks
    });
}

const classNames = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

function doPrediction(model, data, testDataSize = 500) {
    const IMAGE_WIDTH = 28;
    const IMAGE_HEIGHT = 28;
    const testData = data.nextTestBatch(testDataSize);
    const testxs = testData.xs.reshape([testDataSize, IMAGE_WIDTH, IMAGE_HEIGHT, 1]);
    const labels = testData.labels.argMax([-1]);
    const preds = model.predict(testxs).argMax([-1]);

    testxs.dispose();
    return [preds, labels];
}


async function showAccuracy(model, data) {
    const [preds, labels] = doPrediction(model, data);
    const classAccuracy = await tfvis.metrics.perClassAccuracy(labels, preds);
    const container = {name: 'Accuracy', tab: 'Evaluation'};
    tfvis.show.perClassAccuracy(container, classAccuracy, classNames);

    labels.dispose();
}

async function showConfusion(model, data) {
    const [preds, labels] = doPrediction(model, data);
    const confusionMatrix = await tfvis.metrics.confusionMatrix(labels, preds);
    const container = {name: 'Confusion Matrix', tab: 'Evaluation'};
    tfvis.render.confusionMatrix(
        container, {values: confusionMatrix}, classNames);

    labels.dispose();
}

// Variables for referencing the canvas and 2dcanvas context
let canvas, ctx =[];

// Variables to keep track of the mouse position and left-button status
let mouseX, mouseY, mouseDown = 0;

// Draws a dot at a specific position on the supplied canvas name
// Parameters are: A canvas context, the x position, the y position, the size of the dot
function drawDot(ctx, x, y) {
    let pxData = ctx.getImageData(x, y, 28, 28);
    pxData.data[0] = 255;
    pxData.data[1] = 255;
    pxData.data[2] = 255;
    pxData.data[3] = 255;
    ctx.putImageData(pxData, x, y);
}

// Clear the canvas context using the canvas width and height
function cleanCanvas() {
    ctx.forEach(element => {
        element.fillStyle = 'black';
        element.fillRect(0, 0, 28, 28);
    });
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
        ctx[index].fillStyle = 'black';
        ctx[index].fillRect(0, 0, 28, 28);
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

async function exportData() {

    let imgData = [];
    ctx.forEach(element => {
       imgData.push(element.getImageData(0,0,28,28));
    });
    const pred = await tf.tidy(() => {
        let predictions,img,output;
        return imgData.map(element => {
            img = tf.browser.fromPixels(element, 1);
            img = img.reshape([1, 28, 28, 1]);
            img = tf.cast(img, 'float32');
            output = model.predict(img);
            return predictions = Array.from(output.dataSync());
        });
    });
    console.log(pred);
    const finalResults = pred.map(element => {
        return indexOfMax(element);
    });
    console.log(finalResults);
    document.getElementById('numbers').value = finalResults;
}
function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }
    let max = arr[0];
    let maxIndex = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
}
document.getElementById('train').addEventListener('click', run);
document.getElementById('clean').addEventListener('click', cleanCanvas);
document.addEventListener('DOMContentLoaded', init);
document.getElementById('recognize').addEventListener('click', exportData);