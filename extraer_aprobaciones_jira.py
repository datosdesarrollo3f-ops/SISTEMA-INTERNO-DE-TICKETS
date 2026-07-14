import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
import pandas as pd
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

















     























    

    
import os
import json
import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def cargar_env():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")

def subir_a_supabase(filas):
    cargar_env()
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("\n⚠️  Supabase no configurado (.env ausente o incompleto). Saltando la subida a la nube.")
        return
        
    # Limpiar la URL de Supabase para evitar duplicación de /rest/v1/
    supabase_url = supabase_url.strip().rstrip('/')
    if supabase_url.endswith("/rest/v1"):
        supabase_url = supabase_url[:-8]
    supabase_url = supabase_url.rstrip('/')
        
    print("\n🚀 Subiendo datos a Supabase...")
    url = f"{supabase_url}/rest/v1/reclamos"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = []
    for f in filas:
        dias = f.get("DÍAS SIN RESPUESTA")
        try:
            dias_val = int(dias) if dias != "" and dias is not None else None
        except Exception:
            dias_val = None
            
        payload.append({
            "id_pedido": f.get("ID PEDIDO"),
            "estado_aprobacion": f.get("ESTADO APROBACION"),
            "area": f.get("AREA"),
            "tipo_dependencia": f.get("TIPO DE DEPENDENCIA"),
            "institucion": f.get("INSTITUCIÓN"),
            "direccion": f.get("DIRECCIÓN"),
            "via_ingreso": f.get("VÍA DE INGRESO"),
            "fecha_carga": f.get("FECHA CARGA AL SISTEMA"),
            "fecha_resolucion": f.get("FECHA RESOLUCIÓN"),
            "dias_sin_respuesta": dias_val,
            "tipo_pedido": f.get("TIPO DE PEDIDO"),
            "detalle": f.get("DETALLE"),
            "nombre_solicitante": f.get("NOMBRE Y APELLIDO SOLICITANTE"),
            "cargo_solicitante": f.get("CARGO SOLICITANTE"),
            "acciones": f.get("ACCIONES"),
            "estado_reclamo": f.get("ESTADO DEL RECLAMO")
        })
        
    try:
        r = requests.post(url, json=payload, headers=headers, verify=False)
        if r.status_code in (200, 201):
            print(f"✅ ¡{len(payload)} registros sincronizados con Supabase con exito!")
        else:
            print(f"❌ Error al subir a Supabase (Codigo {r.status_code}): {r.text}")
    except Exception as e:
        print(f"❌ Error de conexion al intentar subir a Supabase: {e}")

# ====================================================
# ⚙️  CONFIGURACIÓN
# ====================================================
CARPETA_GUARDADO = r"G:\Mi unidad\SG"
NOMBRE_ARCHIVO   = "aprobaciones_municipio_completo.xlsx"
JIRA_BASE_URL    = "https://moderytecno3f.atlassian.net"
CLOUD_ID         = "483863ff-abbe-4c9b-8d97-74035a8c7768"
MAX_WORKERS      = 4
# ====================================================
# INSTRUCCIONES PARA ABRIR CHROME:
# 1. Cerrá TODOS los Chrome abiertos
# 2. Win+R y pegá:
#    chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
# 3. Iniciá sesión en Jira en ese Chrome
# 4. Ejecutá este script
# ====================================================


# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------

def parsear_fecha(valor) -> str:
    """Convierte cualquier formato de fecha Jira a DD/MM/YYYY HH:MM."""
    if isinstance(valor, dict):
        epoch = valor.get("epochMillis")
        if epoch:
            return datetime.fromtimestamp(epoch / 1000, tz=timezone.utc)\
                           .astimezone().strftime("%d/%m/%Y %H:%M")
        raw = valor.get("jira") or valor.get("iso8601") or ""
        valor = raw

    if isinstance(valor, str) and valor:
        for fmt in (
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
        ):
            try:
                return datetime.strptime(valor, fmt).astimezone().strftime("%d/%m/%Y %H:%M")
            except ValueError:
                continue
        return valor
    return ""


def extraer_texto_adf(nodo) -> str:
    """
    Extrae texto plano de un nodo ADF (Atlassian Document Format).
    ADF es un árbol JSON con nodos 'text', 'paragraph', 'bulletList', etc.
    """
    if isinstance(nodo, str):
        return nodo
    if isinstance(nodo, dict):
        if nodo.get("type") == "text":
            return nodo.get("text", "")
        partes = []
        for hijo in nodo.get("content", []):
            texto = extraer_texto_adf(hijo)
            if texto:
                partes.append(texto)
        return " ".join(partes)
    if isinstance(nodo, list):
        return " ".join(extraer_texto_adf(n) for n in nodo)
    return ""


def extraer_valor_campo(campo: dict) -> str:
    """Convierte requestFieldValue de la API estándar a texto."""
    value = campo.get("value", "")
    if isinstance(value, str):   return value
    if isinstance(value, dict):  return value.get("value", value.get("displayName", str(value)))
    if isinstance(value, list):
        partes = []
        for v in value:
            partes.append(v.get("value", v.get("displayName", str(v))) if isinstance(v, dict) else str(v))
        return " | ".join(partes)
    return str(value) if value else ""


def extraer_respuesta_proforma(answer_obj: dict, q_info: dict) -> str:
    """
    Extrae el valor de una respuesta ProForma teniendo en cuenta
    todos los formatos posibles: text, choices, adf, date, files.
    """
    if not answer_obj:
        return ""

    # Texto enriquecido ADF (ej: detalle de solicitud)
    if "adf" in answer_obj:
        return extraer_texto_adf(answer_obj["adf"]).strip()

    # Texto simple
    if "text" in answer_obj and answer_obj["text"]:
        return str(answer_obj["text"]).strip()

    # Opciones de selección — cruzamos con las choices del diseño
    if "choices" in answer_obj:
        selected  = answer_obj["choices"]
        opciones  = q_info.get("choices", [])
        if opciones:
            elegidos = [o.get("label", "") for o in opciones if o.get("id") in selected]
            return " | ".join(elegidos) if elegidos else str(selected)
        return str(selected)

    # Fecha
    if "date" in answer_obj:
        return parsear_fecha(answer_obj["date"])

    return ""


# ------------------------------------------------------------------
# SESIÓN DESDE CHROME
# ------------------------------------------------------------------

def construir_sesion_desde_chrome() -> requests.Session:
    print("🔌 Conectando al Chrome abierto en puerto 9222...")
    options = Options()
    options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

    try:
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        raise RuntimeError(
            f"❌ No pude conectarme a Chrome.\n"
            f"   Abrilo con: chrome.exe --remote-debugging-port=9222 --user-data-dir=\"C:\\ChromeDebug\"\n"
            f"   Error: {e}"
        )

    url_jira = f"{JIRA_BASE_URL}/servicedesk/customer/user/approvals?approvalQueryType=myApproval"
    driver.get(url_jira)
    print("   ⏳ Esperando que cargue la sesión...")
    time.sleep(5)

    todas_las_cookies = driver.get_cookies()
    user_agent        = driver.execute_script("return navigator.userAgent;")
    xsrf_token        = next(
        (c["value"] for c in todas_las_cookies
         if c["name"] in ("atlassian.xsrf.token", "XSRF-TOKEN", "xsrf_token")),
        ""
    )
    driver.quit()
    print(f"   ✅ {len(todas_las_cookies)} cookies extraídas.")

    session = requests.Session()
    session.headers.update({
        "User-Agent":        user_agent,
        "Accept":            "application/json",
        "Content-Type":      "application/json",
        "Origin":            JIRA_BASE_URL,
        "Referer":           url_jira,
        "X-Atlassian-Token": "no-check",
        "X-ExperimentalApi": "opt-in",
    })
    if xsrf_token:
        session.headers.update({"X-XSRF-Token": xsrf_token})

    for cookie in todas_las_cookies:
        session.cookies.set(cookie["name"], cookie["value"], domain=cookie.get("domain", ""))

    session.verify = False # Deshabilitar verificacion SSL para conexiones en red municipal
    return session


# ------------------------------------------------------------------
# PROFORMA — obtener formularios de un ticket
# ------------------------------------------------------------------

def obtener_forms_proforma(session: requests.Session, issue_id: str, portal_id: str) -> list[dict]:
    """
    Retorna lista de dicts con {form_id, preguntas, respuestas}
    usando los endpoints confirmados como válidos. Intenta listar los formularios
    y, si falla, asume los IDs 1, 2, 3 como fallback.
    """
    base_v3 = (
        f"{JIRA_BASE_URL}/gateway/api/proforma/portal/cloudid/{CLOUD_ID}"
        f"/api/3/portal/{portal_id}/request/{issue_id}"
    )
    base_portal = (
        f"{JIRA_BASE_URL}/gateway/api/proforma/portal/cloudid/{CLOUD_ID}"
        f"/api/cloud/portal/{portal_id}/request/{issue_id}"
    )

    forms_data = []

    # --- Paso 1: intentar obtener la lista de formularios del ticket ---
    lista_forms = None
    for url_lista in [f"{base_v3}/form", f"{base_portal}/form"]:
        r = session.get(url_lista)
        if r.status_code == 200:
            try:
                lista_forms = r.json()
                if lista_forms:
                    break
            except Exception:
                continue

    form_ids_to_check = []

    if lista_forms:
        if isinstance(lista_forms, dict):
            lista_forms = [lista_forms]

        for form_meta in lista_forms:
            if isinstance(form_meta, int):
                form_ids_to_check.append(form_meta)
                continue

            form_id = form_meta.get("id") or form_meta.get("formId")
            if not form_id:
                # Si el objeto ya tiene design+state completo
                if "design" in form_meta and "state" in form_meta:
                    preguntas  = form_meta["design"].get("questions", {})
                    respuestas = form_meta["state"].get("answers", {})
                    forms_data.append({"preguntas": preguntas, "respuestas": respuestas})
                continue
            form_ids_to_check.append(form_id)
    else:
        # Fallback manual si el endpoint de lista devuelve 404 o lista vacía
        form_ids_to_check = [1, 2, 3]

    # --- Paso 2: para cada form, obtener el detalle con preguntas + respuestas ---
    for form_id in form_ids_to_check:
        form_detail = None
        # Intentar con /form/{id} en ambas bases
        for url_det in [
            f"{base_v3}/form/{form_id}",
            f"{base_portal}/form/{form_id}",
        ]:
            r = session.get(url_det)
            if r.status_code == 200:
                try:
                    form_detail = r.json()
                    break
                except Exception:
                    continue

        if form_detail and "design" in form_detail and "state" in form_detail:
            preguntas  = form_detail["design"].get("questions", {})
            respuestas = form_detail["state"].get("answers", {})
            forms_data.append({"preguntas": preguntas, "respuestas": respuestas})

    return forms_data


def mapear_campos_proforma(forms_data: list[dict], campos: dict):
    """
    Rellena el dict campos con los valores encontrados en los formularios ProForma.
    Usa matching por palabras clave en el label de cada pregunta.
    """
    for form in forms_data:
        preguntas  = form["preguntas"]
        respuestas = form["respuestas"]

        for q_id, q_info in preguntas.items():
            label     = q_info.get("label", "")
            label_low = label.lower()
            answer    = respuestas.get(str(q_id), {})
            val       = extraer_respuesta_proforma(answer, q_info)

            if not val:
                continue

            if   "cargo"       in label_low: campos["Cargo laboral"]           = val
            elif "ubicaci"     in label_low: campos["Ubicación del Incidente"] = val
            elif "necesitas"   in label_low: campos["¿Qué necesitas?"]         = val
            elif "tipo"        in label_low: campos["Tipo de problema"]        = val
            # Hay 3 preguntas de "Detalla..." según la sección activa
            # Tomamos la que tenga contenido
            elif "detall"      in label_low:
                if not campos["Detalle de solicitud"]:
                    campos["Detalle de solicitud"] = val


# ------------------------------------------------------------------
# FASE 1 — lista maestra
# ------------------------------------------------------------------

def descargar_lista_maestra(session: requests.Session, query_type: str) -> list[dict]:
    print(f"🚀 Descargando lista maestra de tickets ({query_type})...")
    url, tickets, pagina = f"{JIRA_BASE_URL}/rest/servicedesk/1/customer/models", [], 1

    while True:
        payload = {
            "options": {"approvalListFilter": {
                "filter": "", "approvalQueryType": query_type, "selectedPage": pagina
            }},
            "models": ["approvalListFilter"],
        }
        r = session.post(url, json=payload)
        if r.status_code != 200:
            print(f"   ⚠️  Error {r.status_code} en página {pagina}: {r.text[:200]}")
            break

        data = r.json()
        if "approvalListFilter" not in data: break

        info = data["approvalListFilter"]
        for t in info.get("requests", []):
            ref         = t.get("key", "")
            portal_base = t.get("portalBaseUrl", "")
            portal_id   = portal_base.split("/")[-1] if portal_base else "6"
            tickets.append({
                "Referencia":          ref,
                "Portal ID":           portal_id,
                "Resumen General":     t.get("summary", ""),
                "Estado Actual":       t.get("status", ""),
                "Solicitante General": t.get("reporterDisplayName", ""),
                "Link Directo":        f"{JIRA_BASE_URL}{portal_base}/{ref}" if portal_base else "",
            })

        if pagina >= info.get("totalPages", 1): break
        pagina += 1

    vistos, unicos = set(), []
    for t in tickets:
        if t["Referencia"] not in vistos:
            vistos.add(t["Referencia"])
            unicos.append(t)

    print(f"   ✅ {len(unicos)} tickets únicos.")
    return unicos


# ------------------------------------------------------------------
# FASE 2 — detalle de un ticket (ejecutado en paralelo)
# ------------------------------------------------------------------

def procesar_ticket(session: requests.Session, ticket: dict) -> tuple[dict, list[dict]]:
    ref, portal_id = ticket["Referencia"], ticket["Portal ID"]
    actividad = []

    campos = {
        "Nombre y Apellido":       "",
        "Secretaría solicitante":  "",
        "Cargo laboral":           "",
        "Ubicación del Incidente": "",
        "¿Qué necesitas?":         "",
        "Tipo de problema":        "",
        "Detalle de solicitud":    "",
        "Aprobador":               "",
    }

    # ---- 2A: campos estándar de la API de Service Desk ----
    issue_id = ""
    r_det = session.get(f"{JIRA_BASE_URL}/rest/servicedeskapi/request/{ref}")
    if r_det.status_code == 200:
        d        = r_det.json()
        issue_id = d.get("issueId", "")

        for campo in d.get("requestFieldValues", []):
            label = campo.get("label", "")
            val   = extraer_valor_campo(campo)
            if   "Nombre y Apellido" in label: campos["Nombre y Apellido"]      = val
            elif "Secretaría"        in label: campos["Secretaría solicitante"] = val
            elif "Aprobador"         in label: campos["Aprobador"]              = val

        actividad.append({
            "Referencia":            ref,
            "Fecha y Hora":          parsear_fecha(d.get("createdDate", {})),
            "Autor":                 ticket.get("Solicitante General", "Sistema"),
            "Acción / Notificación": "Solicitud creada",
        })
        estado = d.get("currentStatus", {})
        actividad.append({
            "Referencia":            ref,
            "Fecha y Hora":          parsear_fecha(estado.get("statusDate", {})),
            "Autor":                 "Sistema",
            "Acción / Notificación": f"Cambio de estado a: {estado.get('status', '')}",
        })

    # ---- 2B: formularios ProForma ----
    if issue_id:
        forms_data = obtener_forms_proforma(session, issue_id, portal_id)
        mapear_campos_proforma(forms_data, campos)

    # ---- 2C: comentarios ----
    r_com = session.get(f"{JIRA_BASE_URL}/rest/servicedeskapi/request/{ref}/comment")
    if r_com.status_code == 200:
        for c in r_com.json().get("values", []):
            actividad.append({
                "Referencia":            ref,
                "Fecha y Hora":          parsear_fecha(c.get("created", {})),
                "Autor":                 c.get("author", {}).get("displayName", "Desconocido"),
                "Acción / Notificación": f"Comentario: {c.get('body', '')}",
            })

    return ({**ticket, **campos}, actividad)


# ------------------------------------------------------------------
# FASE 3 — guardar Excel
# ------------------------------------------------------------------

def clasificar_dependencia(nombre_institucion):
    """
    Analiza el nombre de la institución y retorna la dependencia correspondiente.
    """
    nombre = str(nombre_institucion).upper()
    
    if "Envión" in nombre:
        return "ENVION"
    elif "Taller Protegido" in nombre:
        return "TALLER"
    elif "CF3F" in nombre or "Centro de Formacion (3F)" in nombre:
        return "CF3F"
    elif "SEDE" in nombre:
        return "SEDES"
    else:
        # Si no encuentra ninguna coincidencia, mantiene el nombre original o uno por defecto
        return "OTRA DEPENDENCIA"
    
def formatear_datos_finales(datos: list[dict], actividades: list[dict], estado_aprobacion: str) -> list[dict]:
    act_por_ref = {}
    for act in actividades:
        ref = act["Referencia"]
        if ref not in act_por_ref:
            act_por_ref[ref] = []
        act_por_ref[ref].append(act)
        
    def str_to_datetime(date_str):
        if not date_str: return None
        try: return datetime.strptime(date_str, "%d/%m/%Y %H:%M")
        except ValueError: return None

    filas_finales = []
    for d in datos:
        ref = d.get("Referencia", "")
        acts = act_por_ref.get(ref, [])
        acts.sort(key=lambda x: str_to_datetime(x["Fecha y Hora"]) or datetime.min)
        
        fecha_carga = ""
        fecha_resolucion = ""
        acciones_texto = ""
        estado_reclamo = d.get("Estado Actual", "")
        
        for act in acts:
            dt = str_to_datetime(act["Fecha y Hora"])
            fecha_str = dt.strftime("%d/%m/%Y") if dt else act["Fecha y Hora"]
            autor = act.get("Autor", "").upper()
            accion = act.get("Acción / Notificación", "")
            
            acciones_texto += f"{fecha_str} {autor}: {accion}\n"
            
            accion_low = accion.lower()
            if "solicitud creada" in accion_low and not fecha_carga:
                fecha_carga = act["Fecha y Hora"]
            if "cambio de estado a:" in accion_low:
                estado_reclamo = accion.split(":", 1)[1].strip()
                if "completado" in accion_low:
                    fecha_resolucion = act["Fecha y Hora"]
                    
        if not fecha_carga and acts:
            fecha_carga = acts[0].get("Fecha y Hora", "")
            
        dias_sin_respuesta = ""
        if fecha_carga and fecha_resolucion:
            dt_c = str_to_datetime(fecha_carga)
            dt_r = str_to_datetime(fecha_resolucion)
            if dt_c and dt_r:
                dias_sin_respuesta = (dt_r - dt_c).days
            
        tipo_pedido = f"{d.get('¿Qué necesitas?', '')} - {d.get('Tipo de problema', '')}".strip(" -")
        if tipo_pedido == "-": tipo_pedido = ""
        
        fila = {
            "ID PEDIDO": ref,
            "ESTADO APROBACION": estado_aprobacion,
            "AREA": "SERVICIOS GENERALES",
            "TIPO DE DEPENDENCIA": clasificar_dependencia(d.get("Solicitante General", "")), # Dinámico
            "INSTITUCIÓN": d.get("Solicitante General", ""),
            "DIRECCIÓN": d.get("Ubicación del Incidente", ""),
            "VÍA DE INGRESO": "TICKETERA",
            "FECHA CARGA AL SISTEMA": fecha_carga,
            "FECHA RESOLUCIÓN": fecha_resolucion,
            "DÍAS SIN RESPUESTA": dias_sin_respuesta,
            "TIPO DE PEDIDO": tipo_pedido,
            "DETALLE": d.get("Detalle de solicitud", ""),
            "NOMBRE Y APELLIDO SOLICITANTE": d.get("Nombre y Apellido", ""),
            "CARGO SOLICITANTE": d.get("Cargo laboral", ""),
            "ACCIONES": acciones_texto.strip(),
            "ESTADO DEL RECLAMO": estado_reclamo
        }
        filas_finales.append(fila)
        
    return filas_finales


def guardar_excel_completo(datos_a: list[dict], act_a: list[dict], datos_p: list[dict], act_p: list[dict]):
    os.makedirs(CARPETA_GUARDADO, exist_ok=True)
    ruta = os.path.join(CARPETA_GUARDADO, NOMBRE_ARCHIVO)

    # Identificar cuáles son verdaderamente pendientes
    ref_pendientes = {d["Referencia"] for d in datos_p}

    # Separar datos_a en aprobados reales (los que no están en la lista de pendientes)
    datos_aprobados_reales = [d for d in datos_a if d["Referencia"] not in ref_pendientes]
    
    # Combinar actividades y quitar duplicados
    actividades_todas = act_a + act_p
    actividades_vistas = set()
    actividades_unicas = []
    for act in actividades_todas:
        key = (act["Referencia"], act["Fecha y Hora"], act["Acción / Notificación"])
        if key not in actividades_vistas:
            actividades_vistas.add(key)
            actividades_unicas.append(act)

    filas_a = formatear_datos_finales(datos_aprobados_reales, actividades_unicas, "APROBADO")
    filas_p = formatear_datos_finales(datos_p, actividades_unicas, "PENDIENTE A APROBAR")
    
    todas_las_filas = filas_a + filas_p

    from openpyxl.styles import Alignment

    with pd.ExcelWriter(ruta, engine="openpyxl") as writer:
        if todas_las_filas:
            pd.DataFrame(todas_las_filas).to_excel(writer, sheet_name="Reclamos", index=False)
        else:
            pd.DataFrame([{"Mensaje": "No hay datos para guardar"}]).to_excel(writer, sheet_name="Sin_Datos", index=False)

        for sheet in writer.sheets.values():
            for col in sheet.columns:
                max_len = 10
                for cell in col:
                    if cell.value is not None:
                        cell_lines = str(cell.value).split('\n')
                        max_len = max(max_len, max(len(line) for line in cell_lines))
                    if hasattr(cell, 'alignment'):
                        cell.alignment = Alignment(wrap_text=True, vertical='top')

                sheet.column_dimensions[col[0].column_letter].width = min(max_len + 4, 60)

    print(f"\n🎉 Excel guardado en:\n{ruta}")

    # Guardar base_ticketera.js para el sistema interno
    script_dir = os.path.dirname(os.path.abspath(__file__))
    js_ruta_root = os.path.join(script_dir, "base_ticketera.js")
    js_ruta_dist = os.path.join(script_dir, "dist", "base_ticketera.js")
    js_ruta_public = r"C:\Users\Enzo\sistema_reclamos_build\public\base_ticketera.js"
    
    try:
        json_data = json.dumps(todas_las_filas, ensure_ascii=False, indent=2)
        js_content = f"window.baseTicketeraData = {json_data};\nwindow.baseTicketeraLastUpdated = '{datetime.now().strftime('%d/%m/%Y %H:%M')}';\n"
        
        # Guardar en la raíz (para desarrollo local)
        with open(js_ruta_root, "w", encoding="utf-8") as js_file:
            js_file.write(js_content)
        print(f"✅ Base de datos (Dev) guardada en:\n{js_ruta_root}")
        
        # Guardar en la carpeta dist (si existe, para producción compilada)
        dist_dir = os.path.dirname(js_ruta_dist)
        if os.path.exists(dist_dir):
            with open(js_ruta_dist, "w", encoding="utf-8") as js_file:
                js_file.write(js_content)
            print(f"✅ Base de datos (Prod) guardada en:\n{js_ruta_dist}")

        # Guardar en public de React (para desarrollo en el servidor local)
        public_dir = os.path.dirname(js_ruta_public)
        if os.path.exists(public_dir):
            with open(js_ruta_public, "w", encoding="utf-8") as js_file:
                js_file.write(js_content)
            print(f"✅ Base de datos (React Public) guardada en:\n{js_ruta_public}")
            
        # Sincronizar con la base de datos en la nube (Supabase)
        subir_a_supabase(todas_las_filas)
            
    except Exception as e:
        print(f"❌ Error al guardar base_ticketera.js o subir a Supabase: {e}")


# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------

def procesar_lista_tickets(session: requests.Session, tickets: list[dict], desc: str) -> tuple[list[dict], list[dict]]:
    if not tickets:
        print(f"⚠️  No se encontraron tickets {desc}.")
        return [], []

    total = len(tickets)
    datos_detallados, registro_actividad = [], []

    print(f"🔍 Procesando {total} tickets {desc} con {MAX_WORKERS} hilos paralelos...")
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futuros = {executor.submit(procesar_ticket, session, t): t["Referencia"] for t in tickets}
        completados = 0
        for futuro in as_completed(futuros):
            ref = futuros[futuro]
            completados += 1
            try:
                fila, act = futuro.result()
                datos_detallados.append(fila)
                registro_actividad.extend(act)
                print(f"   [{completados:>3}/{total}] ✓ {ref}")
            except Exception as e:
                print(f"   [{completados:>3}/{total}] ⚠️  Error en {ref}: {e}")

    elapsed = time.time() - t0
    print(f"\n⏱️  Completado {desc} en {elapsed:.1f}s ({elapsed/total:.1f}s/ticket promedio)")

    return datos_detallados, registro_actividad


def extraer_aprobaciones_totales():
    session = construir_sesion_desde_chrome()
    
    print("\n=== EXTRACCIÓN DE TICKETS APROBADOS ===")
    tickets_aprobados = descargar_lista_maestra(session, "myApproval")
    datos_a, act_a = procesar_lista_tickets(session, tickets_aprobados, "aprobados")

    print("\n=== EXTRACCIÓN DE TICKETS PENDIENTES ===")
    tickets_pendientes = descargar_lista_maestra(session, "myPending")
    datos_p, act_p = procesar_lista_tickets(session, tickets_pendientes, "pendientes")

    if datos_a or datos_p:
        guardar_excel_completo(datos_a, act_a, datos_p, act_p)
    else:
        print("\n⚠️  No se procesaron datos ni aprobados ni pendientes.")

if __name__ == "__main__":
    extraer_aprobaciones_totales()
