from quart import Quart, websocket, send_file, send_from_directory, render_template
import asyncio
import os

app = Quart(__name__)
connected_clients = set()

## openssl req -new -newkey rsa:2048 -nodes -keyout https.key -x509 -days 3650 -out https.crt
    ## quart --app app --debug run --cert=https.crt --key=https.key --host=0.0.0.0 --port=8080
# ipconfig getifaddr en0
#### 192.168.1.119

@app.route('/')
async def index():
    return await render_template('index.html')

@app.route('/volume')
async def volume_page():
    return await render_template('volume.html')

@app.route('/static/<path:filename>')
async def static_files(filename):
    static_dir = os.path.join(os.getcwd(), 'static')
    return await send_from_directory(static_dir, filename)

@app.websocket('/ws')
async def ws():
    print('Client connected to /ws')
    connected_clients.add(websocket._get_current_object())
    try:
        while True:

            await asyncio.sleep(10)
    except asyncio.CancelledError:
        print('Client disconnected')
    except Exception as e:
        print(f'Unexpected error: {e}')
    finally:
        connected_clients.remove(websocket._get_current_object())
        print('Cleaning up connection resources')

@app.websocket('/volume_ws')
async def volume_ws():
    print('Client connected to /volume_ws')
    try:
        while True:
            data = await websocket.receive_json()

            # Broadcast to all connected clients on /ws
            for client in connected_clients:
                try:
                    await client.send_json({
                        'type': 'vibrate',
                        'pattern': [20]  # Example vibration pattern
                    })
                except Exception as e:
                    print(f"Error sending to client: {e}")
    except asyncio.CancelledError:
        print('Volume page disconnected')
    except Exception as e:
        print(f'Unexpected error: {e}')
    finally:
        print('Cleaning up volume connection resources')

if __name__ == '__main__':
    context = ('cert.pem', 'key.pem')  # For HTTPS, if configured
    app.run(host='0.0.0.0', port=8080, ssl_context=context)
