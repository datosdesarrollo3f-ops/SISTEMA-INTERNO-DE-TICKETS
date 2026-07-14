import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
import os
import json
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Cargar credenciales del archivo .env
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_KEY", "")

# Limpiar URL
supabase_url = supabase_url.strip().rstrip('/')
if supabase_url.endswith("/rest/v1"):
    supabase_url = supabase_url[:-8].rstrip('/')

if not supabase_url or not supabase_key:
    print("ERROR: Falta configurar SUPABASE_URL o SUPABASE_KEY en el archivo .env")
    input("Presione Enter para salir...")
    sys.exit(1)

# Leer usuarios del archivo usuarios.json
json_path = os.path.join(script_dir, "usuarios.json")
if not os.path.exists(json_path):
    print(f"ERROR: No se encontro el archivo {json_path}")
    input("Presione Enter para salir...")
    sys.exit(1)

with open(json_path, "r", encoding="utf-8") as f:
    usuarios_raw = json.load(f)

# Convertir al formato de la tabla de Supabase
payload = []
for nombre, datos in usuarios_raw.items():
    payload.append({
        "nombre_usuario": nombre,
        "contrasena": datos.get("password", ""),
        "rol": datos.get("role", "usuario")
    })

if not payload:
    print("No hay usuarios para subir.")
    input("Presione Enter para salir...")
    sys.exit(0)

print(f"Subiendo {len(payload)} usuarios a Supabase...")
for u in payload:
    print(f"  - {u['nombre_usuario']} (rol: {u['rol']})")

url = f"{supabase_url}/rest/v1/usuarios"
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

try:
    r = requests.post(url, json=payload, headers=headers, verify=False)
    if r.status_code in (200, 201):
        print(f"\n[OK] {len(payload)} usuarios sincronizados con Supabase con exito!")
    else:
        print(f"\n[ERROR] Codigo {r.status_code}: {r.text}")
except Exception as e:
    print(f"\n[ERROR] No se pudo conectar con Supabase: {e}")

input("\nPresione Enter para salir...")
