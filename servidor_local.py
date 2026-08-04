import sys
import os
import subprocess
import json
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# Configurar encoding utf-8 para la consola de Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PORT = 5000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BOT_SCRIPT = os.path.join(SCRIPT_DIR, "extraer_aprobaciones_jira.py")

estado_bot = {
    "ejecutando": False,
    "ultimo_resultado": "No se ha ejecutado aun",
    "ultima_ejecucion": ""
}

def ejecutar_bot_thread():
    global estado_bot
    estado_bot["ejecutando"] = True
    estado_bot["ultimo_resultado"] = "En progreso..."
    estado_bot["ultima_ejecucion"] = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando bot de extraccion de Jira...")
    try:
        result = subprocess.run(
            [sys.executable, BOT_SCRIPT],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        if result.returncode == 0:
            estado_bot["ultimo_resultado"] = "Exito"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Bot finalizado con exito.")
        else:
            stderr_info = result.stderr.strip() if result.stderr else (result.stdout.strip() if result.stdout else "Error desconocido")
            lines = [l for l in stderr_info.splitlines() if l.strip()]
            last_line = lines[-1] if lines else stderr_info
            msg = f"Error (codigo {result.returncode}): {last_line[:180]}"
            estado_bot["ultimo_resultado"] = msg
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}:\n{result.stderr}")
    except Exception as e:
        estado_bot["ultimo_resultado"] = f"Excepcion: {str(e)}"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Excepcion al ejecutar el bot: {e}")
    finally:
        estado_bot["ejecutando"] = False

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Private-Network')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        self._set_headers(200)
        response = {
            "status": "online",
            "bot_ejecutando": estado_bot["ejecutando"],
            "ultimo_resultado": estado_bot["ultimo_resultado"],
            "ultima_ejecucion": estado_bot["ultima_ejecucion"]
        }
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def do_POST(self):
        if self.path in ('/ejecutar-bot', '/ejecutar-bot/'):
            if estado_bot["ejecutando"]:
                self._set_headers(409)
                response = {"status": "busy", "message": "El bot ya esta ejecutandose actualmente."}
            else:
                t = threading.Thread(target=ejecutar_bot_thread)
                t.daemon = True
                t.start()
                self._set_headers(200)
                response = {"status": "started", "message": "Bot de Jira iniciado en tu PC local."}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Ruta no encontrada"}).encode('utf-8'))

    def log_message(self, format, *args):
        # Evitar inundar la consola con peticiones repetidas
        return

def run_server():
    server = HTTPServer(('0.0.0.0', PORT), RequestHandler)
    print("============================================================")
    print(f"SERVIDOR LOCAL DE CONTROL ACTIVADO (Puerto {PORT})")
    print("============================================================")
    print(f"Escuchando peticiones en: http://localhost:{PORT}")
    print("Permite iniciar el bot de Jira directamente desde el Panel Admin.")
    print("Mantenga esta consola abierta para usar la ejecucion remota.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor local detenido.")

if __name__ == '__main__':
    run_server()
