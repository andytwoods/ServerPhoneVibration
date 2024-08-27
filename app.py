import asyncio

from quart import Quart, websocket, send_file, send_from_directory, render_template

app = Quart(__name__, static_folder='static')
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 1

## openssl req -new -newkey rsa:2048 -nodes -keyout https.key -x509 -days 3650 -out https.crt
    ## quart --app app --debug run --cert=https.crt --key=https.key --host=0.0.0.0 --port=8080
# ipconfig getifaddr en0
#### 192.168.1.119

@app.route('/')
async def index():
    return await render_template("index.html")

@app.route('/volume')
async def volume_page():
    return await render_template('volume.html')


# Serve static files like JavaScript and CSS
@app.route('/static/<path:filename>')
async def static_files(filename):
    return await send_from_directory(app.static_folder, filename)


@app.websocket('/ws')
async def ws():
    print('Client connected')
    try:
        while True:
            # Example: Send a vibration command every 10 seconds
            print(11)
            await websocket.send_json({
                'type': 'vibrate',
                'pattern': [400, 100, 200]  # Example vibration pattern
            })
            await asyncio.sleep(10)
    except asyncio.CancelledError:
        print('Client disconnected')

@app.websocket('/volume_ws')
async def volume_ws():
    print('Client connected to /volume_ws')
    try:
        while True:
            data = await websocket.receive_json()
            print(f"Volume threshold exceeded: {data['volume']}")
            # Handle the volume data here (e.g., store, process, or trigger events)
            await websocket.send_json({
                'type': 'vibrate',
                'pattern': [50, 100, 200]  # Example vibration pattern
            })
    except asyncio.CancelledError:
        print('Volume page disconnected')
    except Exception as e:
        print(f'Unexpected error: {e}')
    finally:
        print('Cleaning up volume connection resources')

if __name__ == '__main__':
    context = ('https.crt', 'https.key')  # Path to your certificate and key files
    app.run(host='0.0.0.0', port=8080, debug=True)