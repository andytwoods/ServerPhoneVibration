const statusElement = document.getElementById('status');
const startButton = document.getElementById('startButton');
let socket;
let wakeLock = null;

startButton.addEventListener('click', () => {
    startButton.disabled = true; // Disable the button after it's clicked
    connectWebSocket();
    keepScreenAwake();
});

function connectWebSocket() {
    let location = window.location.href;
    if(location.indexOf("https")!==-1) {
        location = location.split("https://").join("")
        location = "wss://" + location
    }
    else{
        location = location.split("http://").join("")
        location = "ws://" + location
    }
    socket = new WebSocket(location + '/ws');

    socket.onopen = function() {
        statusElement.textContent = 'Connected';
    };

    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        if (message.type === 'vibrate') {
            navigator.vibrate(message.pattern);
        }
    };

    socket.onclose = function() {
        statusElement.textContent = 'Disconnected';
        console.log('Connection lost, attempting to reconnect in 5 seconds...');
        setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
    };

    socket.onerror = function(error) {
        console.error('WebSocket Error: ', error);
    };
}

// Prevent phone screen from switching off
async function keepScreenAwake() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            errMessage('Wake Lock was released');
            console.log('Wake Lock was released');
        });
    } catch (err) {
         errMessage(`${err.name}, ${err.message}`);
        console.error(`${err.name}, ${err.message}`);
    }
}

function errMessage(msg){
    document.getElementById('output').innerText += '\n' + msg;
}
