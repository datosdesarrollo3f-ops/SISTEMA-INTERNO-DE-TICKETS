/**
 * SUPABASE SYNC - Sincronización robusta de usuarios
 * Garantiza que:
 * 1. Las cuentas maestras ('admin' / 'admin123' y 'usuario' / '123456') NUNCA desaparezcan ni se bloqueen.
 * 2. Todos los usuarios de Supabase se sincronicen en localStorage sin borrar usuarios existentes.
 * 3. Las comparaciones sean insensibles a mayúsculas/minúsculas y espacios accidentales.
 */
(function() {
  var SUPABASE_URL = "https://mcabmoabfythqrbeywct.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYWJtb2FiZnl0aHFyYmV5d2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzIxMjEsImV4cCI6MjA5OTU0ODEyMX0.mOsE8dGseQ493mwfxiIU8_ET1uN4BeYBJ7z4TXh9ik4";

  var DEFAULT_USERS = {
    "usuario": { password: "123456", role: "usuario" },
    "admin": { password: "admin123", role: "admin" }
  };

  // Asegurar siempre existencia de usuarios base en localStorage al inicio
  try {
    var existing = JSON.parse(localStorage.getItem("portal_users") || "{}");
    var mergedInit = Object.assign({}, DEFAULT_USERS, existing);
    localStorage.setItem("portal_users", JSON.stringify(mergedInit));
  } catch (e) {
    localStorage.setItem("portal_users", JSON.stringify(DEFAULT_USERS));
  }

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

  var _isSyncingInternal = false;

  // 1. Descargar usuarios de Supabase y fusionarlos de forma segura
  fetch(API_URL + "?select=*", { headers: HEADERS })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && Array.isArray(data)) {
        var current = {};
        try {
          current = JSON.parse(localStorage.getItem("portal_users") || "{}");
        } catch (e) {}

        var merged = Object.assign({}, DEFAULT_USERS, current);
        data.forEach(function(u) {
          var uName = (u.nombre_usuario || "").trim().toLowerCase();
          if (uName) {
            merged[uName] = {
              password: String(u.contrasena || "").trim(),
              role: (u.rol || "usuario").trim().toLowerCase()
            };
          }
        });

        // Guardar sin disparar loop
        _isSyncingInternal = true;
        localStorage.setItem("portal_users", JSON.stringify(merged));
        _isSyncingInternal = false;
        console.log("[Supabase Sync] Usuarios sincronizados:", Object.keys(merged).length);
      }
    })
    .catch(function(err) {
      console.warn("[Supabase Sync] Usando base de usuarios local/fallback:", err);
    });

  var _setItem = localStorage.setItem.bind(localStorage);

  localStorage.setItem = function(key, value) {
    _setItem(key, value);

    if (key === "portal_users" && !_isSyncingInternal) {
      try {
        var users = JSON.parse(value);
        var payload = [];
        Object.keys(users).forEach(function(nombre) {
          var cleanName = (nombre || "").trim().toLowerCase();
          if (cleanName) {
            payload.push({
              nombre_usuario: cleanName,
              contrasena: String(users[nombre].password || "").trim(),
              rol: (users[nombre].role || "usuario").trim().toLowerCase()
            });
          }
        });

        if (payload.length > 0) {
          fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(payload)
          }).catch(function() {});
        }
      } catch(e) {}
    }
  };
})();
