/**
 * SUPABASE SYNC - Sincronización automática de usuarios
 * Este script se carga ANTES de la app React y hace que los usuarios
 * se lean y escriban automáticamente en Supabase (la nube).
 */
(function() {
  // --- CONFIGURACIÓN ---
  var SUPABASE_URL = "https://mcabmoabfythqrbeywct.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYWJtb2FiZnl0aHFyYmV5d2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzIxMjEsImV4cCI6MjA5OTU0ODEyMX0.mOsE8dGseQ493mwfxiIU8_ET1uN4BeYBJ7z4TXh9ik4";
  // ---------------------

  // Limpiar URL
  SUPABASE_URL = SUPABASE_URL.replace(/\/+$/, "");
  if (SUPABASE_URL.endsWith("/rest/v1")) {
    SUPABASE_URL = SUPABASE_URL.slice(0, -8).replace(/\/+$/, "");
  }

  var API_URL = SUPABASE_URL + "/rest/v1/usuarios";
  var HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
  };

  // 1. Al cargar la página: descargar usuarios de Supabase y meterlos en localStorage
  fetch(API_URL + "?select=*", { headers: HEADERS })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.length > 0) {
        var users = {};
        data.forEach(function(u) {
          users[u.nombre_usuario] = {
            password: u.contrasena,
            role: u.rol
          };
        });
        localStorage.setItem("portal_users", JSON.stringify(users));
        console.log("[Supabase Sync] " + data.length + " usuarios cargados desde la nube.");
      }
    })
    .catch(function(err) {
      console.warn("[Supabase Sync] No se pudo conectar con Supabase. Usando datos locales.", err);
    });

  // 2. Interceptar cambios en localStorage para sincronizar automáticamente
  var _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    _setItem(key, value); // Guardar normalmente en localStorage

    // Si se modificó portal_users, sincronizar con Supabase
    if (key === "portal_users") {
      try {
        var users = JSON.parse(value);
        var payload = [];
        Object.keys(users).forEach(function(nombre) {
          payload.push({
            nombre_usuario: nombre,
            contrasena: users[nombre].password,
            rol: users[nombre].role
          });
        });

        fetch(API_URL, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify(payload)
        })
        .then(function(res) {
          if (res.ok) {
            console.log("[Supabase Sync] Usuarios sincronizados con la nube.");
          } else {
            res.text().then(function(t) { console.warn("[Supabase Sync] Error:", t); });
          }
        })
        .catch(function(err) {
          console.warn("[Supabase Sync] Error de conexion:", err);
        });
      } catch(e) {
        // No es JSON válido, ignorar
      }
    }
  };
})();
