# Rediseño ARVI 2026

- Página: `src/pages/index.astro` (usa `src/layouts/LayoutArvi.astro`).
- Secciones editables: `src/sections/arvi/*.astro` (una por bloque: Hero, Juegos, Sustentable, ArviHappy, ArviSeguro, etc.).
- Estilos: `src/styles/arvi.css` (CSS propio, no depende de Tailwind).
- Imágenes optimizadas (WebP): `public/img/`.
- Descargables (PDF): `public/descargas/`.
- El diseño anterior sigue en `src/sections/Home/` y `src/layouts/Layout.astro` por si se quiere volver.

Pendiente: el PDF "Proyecto ARVI Sustentable" (95 MB) no se incluyó por peso; conviene comprimirlo antes de subirlo.
