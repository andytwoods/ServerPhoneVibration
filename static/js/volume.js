const volumeBar = document.getElementById('volumeBar');
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
    location = location.split("/volume").join("");
    if(location.indexOf("https") !== -1) {
        location = location.split("https://").join("");
        location = "wss://" + location;
    } else {
        location = location.split("http://").join("");
        location = "ws://" + location;
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

        // Update the volume bar width
        const volumePercentage = Math.min((volume / 255) * 100, 100);
        volumeBar.style.width = `${volumePercentage}%`;
        volumeBar.style.backgroundColor = volume > threshold ? 'red' : 'green';

        if (volume > threshold) {
            socket.send(JSON.stringify({ volume: Math.round(volume) }));
        }
    };

    microphone.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
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
