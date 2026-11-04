# Rediseño ARVI 2026

- Página: `src/pages/index.astro` (usa `src/layouts/LayoutArvi.astro`).
- Contenido: `src/sections/arvi/Home.astro` (cada bloque marcado con su id: juegos, sustentable, arvi-happy, arvi-seguro, eventos, contacto). Video del inicio: `public/media/hero.mp4`.
- Estilos: `src/styles/arvi.css` (CSS propio, no depende de Tailwind).
- Imágenes optimizadas (WebP): `public/img/`.
- Descargables (PDF): `public/descargas/`.
- El diseño anterior sigue en `src/sections/Home/` y `src/layouts/Layout.astro` por si se quiere volver.

Pendiente: el PDF "Proyecto ARVI Sustentable" (95 MB) no se incluyó por peso; conviene comprimirlo antes de subirlo.


## Asistente Zorro ARVI (chat de preguntas frecuentes)

- Código y respuestas: `public/js/arvi-bot.js` (sin servidor ni IA externa).
  - `RIDES`: fichas de cada juego (capacidad, montaje, medidas, energía, público) del catálogo 2026.
  - `INTENTS`: preguntas frecuentes con sus palabras clave (`k`) y respuesta (`r`). Las de ARVI Happy llevan `ctx: 'happy'`.
- Entiende errores de tipeo, abreviaciones (q, xq, wsp, cumple…), preguntas de seguimiento ("¿y cuánto mide?") y responde hasta dos temas por mensaje.
- Si no sabe, deriva a WhatsApp con la pregunta ya escrita.
- Pruebas: `node scripts/bot-tests.cjs` (corre también en el workflow Build check). Al agregar una respuesta, suma una pregunta de ejemplo en el archivo de pruebas.
- Ojo: los valores de ARVI Happy están vigentes hasta el 31-12-2026.
