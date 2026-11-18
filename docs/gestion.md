# Gestión ARVI (privada)

Eventos, programación del equipo, cobranza y clientes conectados, con exportación a Excel y JPG.

- URL (no enlazada, `noindex` y bloqueada en robots.txt): `https://arvi.cl/gestion/`
- Código: `public/gestion/` (HTML + JS sin build).
- Login y datos: **el mismo proyecto Firebase y los mismos usuarios que la agenda ARVI HAPPY** (`ArviAdmin`, `ConiAdmin`, `BastiánAdmin`, misma contraseña). Lee `public/agenda-happy-k7m2q9/config.js`.
- Firestore: colecciones `gestion_workers`, `gestion_vehicles`, `gestion_clients`, `gestion_events`, `gestion_shifts`, `gestion_invoices`. Sincronización en vivo entre usuarios.

## Activación (una vez)

En Firebase → Firestore Database → **Reglas**, pega el contenido actualizado de [`agenda-happy-firestore.rules`](./agenda-happy-firestore.rules) y publica. Sin ese paso la web muestra "Sin permisos".

Después entra con tu usuario → **Ajustes → Importar desde Excel** y sube `eventos_arvi_juegos.xlsx` (elige mes/año) y `COBRANZA_2026_ARVI.xlsx`.

## Los datos no se borran

- Quedan guardados en Firestore (Google), no en el navegador: cambiar de computador, borrar el historial o cerrar sesión no los afecta.
- "Eliminar" en la web solo los manda a la **Papelera** (Ajustes), desde donde se recuperan. Las reglas de Firestore prohíben el borrado definitivo.
- Respaldo extra: Ajustes → *Excel completo* o *Respaldo (.json)*.
