# Instrucciones para el Asistente GitHub Copilot (`landing-arvi`)

Este proyecto es una landing page estática desarrollada para ARVI Entretenciones utilizando Astro 5, Tailwind CSS 4 y TypeScript. Como agente IA asistente en este proyecto, obedece estrictamente los siguientes patrones y convenciones.

## Arquitectura y Despliegue (SSG)

- **Modo de renderizado**: Exclusivamente Static Site Generation (SSG). **No existe Server-Side Rendering (SSR)**.
- **Fetch de Datos**: Cualquier llamada a APIs externas o lectura asíncrona de datos (ej. desde `src/utils/instagram.ts`) debe ocurrir en **build-time** dentro del frontmatter (`---`) de los componentes `.astro`. No construimos API routes clásicas.
- **Estrategia DevOps**: El sitio compila a un directorio `dist/` estático y se sincroniza contra un bucket de AWS S3 respaldado por CloudFront.
- **CI/CD**: El despliegue se activa vía pushes a `master`, ejecución manual (workflow_dispatch) y con Jobs Cron programados (`.github/workflows/deploy.yml`) asumiendo roles hacia AWS por medio de OIDC.

## Estructura del Código

Mantén los componentes estructurados rígidamente según sus responsabilidades en la web:

- `src/pages/index.astro`: Único punto de entrada (landing page monolítica de largo scroll).
- `src/sections/Home/`: Bloques de alto nivel (como si fuesen layouts de un slice de la página) (ej. `Hero.astro`, `AboutUs.astro`).
- `src/components/ui/`: Componentes atómicos e independientes agnósticos del modelo de datos de un layout (ej. `Button.astro`, `Card.astro`, `PopUp.astro`).
- `src/utils/`: Capa lógica con helpers y clientes HTTP estáticos diseñados para compilar los props a construir.

## Entornos y Alias (Imports)

- **Variables de entorno**: Cárgalas desde variables tipables globalmente usando el prefijo de Vite para Astro: `import.meta.env.TU_VARIABLE_AQUI`. Éstas variables se insertan localmente a través de `.env` y remotamente interpolándolas en GitHub Actions.
- **Resolución de Paths**: Utiliza explícitamente los aliases mapeados en `tsconfig.json`. Ejemplo: `import Button from '@components/ui/Button.astro'` o `import Component from '@sections/Home/AboutUs.astro'`.

## Sistema de Diseño y UI

- **Tailwind CSS V4**: El proyecto hace uso de TailwindCSS (por `@tailwindcss/vite`).
- **Colores Custom**: Las paletas corporativas están configuradas. Usa el prefijo `arvi-` consistentemente (ej. `bg-arvi-background`, `text-arvi-primary`, `hover:bg-arvi-secondary/90`).
- **Fuentes Tipográficas**:
  - `font-heading` (Fira Sans): Usada principalmente para las etiquetas `<h1-h6>`.
  - `font-body` (Inter): Fuente del flujo por el documento entero (o body principal).
- **Animaciones**: Utiliza extensiones provistas por `@midudev/tailwind-animations` incluido activamente en el proyecto.
- **Íconos**: Se construyen insertando `<Icon name="mdi:nombre-icono" />` desde el paquete de `astro-icon/components`.

## Comandos y Flujo Relevante

- **Compilaciones Frecuentes**: Corre e implementa el linter y parser localmente antes de cada commit.
  `npm run lint` y `npm run format:check`.
- **Reproducción de Errores Vía SSG**: Corre `npm run build` asiduamente para simular el comportamiento de despliegue si tocas fetch en Astro, dado que no emitirá el error si solo corres `npm run dev` sin visualizar el subcomponente en pantalla.
