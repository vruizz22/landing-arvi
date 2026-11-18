# Agenda ARVI HAPPY (privada)

Calendario de reservas en tiempo real para el salón ARVI HAPPY.

- URL (no enlazada desde el sitio, con `noindex`): `https://arvi.cl/agenda-happy-k7m2q9/`
- Código: `public/agenda-happy-k7m2q9/` (HTML + JS sin build; Astro lo copia tal cual a `dist/`).
- Datos: Firebase Firestore, colección `reservas`. Login: Firebase Authentication (correo/contraseña).
- **Ningún dato de clientes ni contraseña vive en este repositorio.** Mientras `config.js` no tenga los datos de Firebase, la página funciona en *modo demo* (datos de ejemplo en el navegador).

## Puesta en marcha (una sola vez, ~5 minutos)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (por ejemplo `arvi-happy-agenda`). Google Analytics no es necesario.
2. **Authentication** → Comenzar → habilitar **Correo electrónico/contraseña**. En la pestaña *Usuarios* → **Agregar usuario**, crea estos 3 (la contraseña la defines tú ahí):
   | Usuario en la agenda | Correo en Firebase |
   | --- | --- |
   | ArviAdmin | `arvi.juegos@gmail.com` |
   | ConiAdmin | `coniadmin@arvi.cl` |
   | BastiánAdmin | `ajienciapica@gmail.com` |
   (Los correos no necesitan existir; solo son el identificador interno.)
3. **Firestore Database** → Crear base de datos → modo producción → región `southamerica-west1` (Santiago).
   En la pestaña **Reglas**, pega el contenido de [`agenda-happy-firestore.rules`](./agenda-happy-firestore.rules) y publica.
4. **Configuración del proyecto** (engranaje) → *Tus apps* → ícono web `</>` → registra la app → copia el objeto `firebaseConfig` y pégalo en `public/agenda-happy-k7m2q9/config.js` (reemplaza `PEGAR_AQUI`). Esos datos no son secretos.
5. Haz push a `master` → se despliega solo.
6. Entra a la agenda con **BastiánAdmin** → **⋯ Más → Importar agenda (Excel)** y sube `AGENDA_ARVIHAPPY_2026-27.xlsx`. Se cargan todas las reservas (julio 2026 – enero 2027). Puedes volver a importar sin duplicar: las reservas con misma fecha, responsable y niño se actualizan.

## Funciones

- Calendario mensual y vista lista, con colores por estado de pago (pendiente / abonado / pagado / cancelado).
- Cada reserva: fecha, bloque y horario, responsable, niño/a o grupo, contacto, tipo, estado, **precio a pagar**, **abonado** + fecha, saldo pagado + fecha, garantía (pendiente / pagada / devuelta), personaje, corpóreo, hora extra y notas. Precio sugerido según la tarifa 2026.
- Resumen del mes (total, abonado, pendiente, garantías) y alertas de cobro para eventos de los próximos 7 días (el saldo se paga mínimo 3 días antes).
- Sincronización en vivo entre los 3 usuarios (Firestore `onSnapshot`), con registro de quién editó por última vez.
- Exportar el mes en **PDF** (calendario + detalle) o **JPG** (calendario).
