from flask import Flask
import threading
import os

app = Flask(__name__)

@app.route('/')
def home():
    return '''
    <html>
        <head>
            <title>Discord Music Bot</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                h1 { margin: 0 0 20px 0; }
                .status { 
                    font-size: 24px; 
                    margin: 20px 0;
                }
                .pulse {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    background: #00ff00;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 Discord Music Bot</h1>
                <div class="status">
                    <span class="pulse"></span>
                    Bot is running
                </div>
                <p>The bot is active and ready to play music!</p>
            </div>
        </body>
    </html>
    '''

@app.route('/health')
def health():
    return {'status': 'healthy', 'bot': 'running'}, 200

def run_server():
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)

def start_server():
    """Inicia el servidor web en un thread separado"""
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    print(f"Servidor web iniciado en puerto {os.environ.get('PORT', 10000)}")
