const visualizer = document.getElementById('visualizer');
const thresholdSlider = document.getElementById('threshold');
const thresholdDisplay = document.getElementById('thresholdDisplay');
const startButton = document.getElementById('startButton');
const output = document.getElementById('output');
let socket;
let audioContext;
let analyser;
let microphone;
let javascriptNode;
let threshold = 50;

thresholdSlider.addEventListener('input', (event) => {
    threshold = event.target.value;
    thresholdDisplay.textContent = threshold;
});

startButton.addEventListener('click', () => {
    startButton.disabled = true; // Disable the button after it's clicked
    init();
});

function connectWebSocket() {
    let location = window.location.href;
    location = location.split("/volume").join("")
    if(location.indexOf("https")!==-1) {
        location = location.split("https://").join("")
        location = "wss://" + location
    }
    else{
        location = location.split("http://").join("")
        location = "ws://" + location
    }
    socket = new WebSocket(location + '/volume_ws');

    socket.onopen = function() {
        output.textContent = 'Connected to WebSocket';
    };

    socket.onclose = function() {
        output.textContent = 'Disconnected from WebSocket';
        setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
    };

    socket.onerror = function(error) {
        console.error('WebSocket Error: ', error);
    };
}

function visualize(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    javascriptNode.onaudioprocess = function() {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        drawVisualizer(dataArray);

        if (volume > threshold) {
            socket.send(JSON.stringify({ volume: volume }));
        }
    };

    microphone.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
}

function drawVisualizer(dataArray) {
    const canvasCtx = visualizer.getContext('2d');
    const width = visualizer.width;
    const height = visualizer.height;

    canvasCtx.clearRect(0, 0, width, height);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, width, height);

    const barWidth = (width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;
        const color = barHeight > threshold ? 'red' : 'green';

        canvasCtx.fillStyle = color;
        canvasCtx.fillRect(x, height - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
    }

    // Draw the threshold line
    canvasCtx.strokeStyle = 'black';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height - threshold / 2);
    canvasCtx.lineTo(width, height - threshold / 2);
    canvasCtx.stroke();
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        visualize(stream);
        connectWebSocket();
    } catch (err) {
        console.error('Error accessing microphone: ', err);
        output.textContent = 'Microphone access denied.';
    }
}
