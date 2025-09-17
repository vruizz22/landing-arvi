# Landing ARVI

Sitio de presentación de ARVI, enfocado en eventos, juegos mecánicos y soluciones eco-sustentables. Construido con Astro 5 y Tailwind CSS 4, con despliegue automatizado a AWS S3 + CloudFront.

- Sitio: https://arvi.cl
- Rama principal de despliegue: master
- Rama de desarrollo: develop

## Tecnologías

- Astro 5
- Tailwind CSS 4 (con @tailwindcss/vite)
- Iconos con astro-icon (Iconify)
- ESLint + TypeScript-ESLint + eslint-plugin-astro
- Prettier + plugins (Astro, Tailwind)
- GitHub Actions (OIDC) → AWS S3 + CloudFront
- Sitemap automático (@astrojs/sitemap)

## Estructura del proyecto

```
/
├─ .github/workflows/deploy.yml   # CI/CD a AWS S3 + CloudFront (push a master)
├─ public/                        # Assets estáticos públicos (favicons, imágenes, robots.txt)
├─ src/
│  ├─ assets/                     # Imágenes y estáticos usados por Astro
│  ├─ components/
│  │  ├─ InstagramCarousel.astro
│  │  └─ FAQ.astro                # Placeholder
│  ├─ layouts/
│  │  └─ Layout.astro             # Layout principal
│  ├─ pages/
│  │  └─ index.astro              # Home
│  ├─ sections/                   # Secciones de la Home
│  └─ styles/                     # Estilos globales/utilidades
├─ astro.config.mjs               # Site, Tailwind (Vite), Iconify, Sitemap
├─ tailwind.config.mjs
├─ eslint.config.js
├─ package.json
├─ pnpm-lock.yaml
└─ tsconfig.json
```

## Scripts

Desde package.json:

- dev: servidor de desarrollo
- build: build de producción a ./dist
- preview: previsualizar el build localmente
- astro: CLI de Astro
- lint: ejecutar ESLint
- format: aplicar Prettier
- format:check: comprobar formato sin escribir

Ejemplos:

```
pnpm install
pnpm dev
pnpm build
```

Con npm:

```
npm install
npm run dev
npm run build
```

## Estilo de código

- ESLint y Prettier están configurados.
- Recomendado ejecutar:
  - pnpm lint
  - pnpm format:check

## Configuración y contenido

- Configuración del sitio: astro.config.mjs (site: https://arvi.cl, integraciones).
- Tailwind: tailwind.config.mjs (tema, colores, fuentes y plugin de animaciones).
- Layout y metadatos: src/layouts/Layout.astro.
- Home: src/pages/index.astro.
- Componentes:
  - InstagramCarousel.astro: carrusel para contenido social.
  - FAQ.astro: definido como placeholder.
- Secciones: src/sections/ contiene los bloques de la Home.
- Imágenes:
  - Colócalas en public/ (sirve tal cual) o en src/assets/ (import desde componentes).
  - Optimiza peso y usa formatos modernos (WebP/AVIF) cuando sea posible.

## Despliegue (CI/CD)

El despliegue se ejecuta automáticamente al hacer push a la rama master.

- Pipeline: .github/workflows/deploy.yml
- Pasos:
  1) Build del sitio (Node 20)
  2) Sincronización a S3:
     - Assets (cache largo, 1 año)
     - HTML (cache corto, 60s)
  3) Subida de sitemaps y robots.txt con content-type correcto
  4) Invalidación de CloudFront
- Requisitos (Secrets del repositorio):
  - AWS_REGION
  - S3_BUCKET
  - CLOUDFRONT_DISTRIBUTION_ID
- Autenticación: OIDC asumiendo el role arn:aws:iam::084414214145:role/GitHubActionsDeployRole

Flujo recomendado:
- Trabajo en develop
- Merge a master para disparar el deploy

## Requisitos

- Node.js 20+
- PNPM (recomendado; el repo incluye pnpm-lock.yaml)
- Alternativa: npm o yarn

## Cómo contribuir

- Branches:
  - feature/nombre-corto, fix/bug-descriptivo, chore/config-x, docs/readme, etc.
- Commits (Conventional Commits):
  - feat, fix, docs, style, refactor, perf, test, chore, ci
  - Ej.: feat(home): agrega carrusel de Instagram
- PRs:
  - Un objetivo por PR
  - Descripción clara y capturas si aplica
  - Pasar lint y format antes de enviar

## Roadmap sugerido

- Completar contenido y comportamiento de FAQ.
- Añadir tests básicos.
- Mejorar accesibilidad (aria, focus en modales, contraste).
- Automatizar optimización de imágenes.
- Unificar y documentar favicons/og-images.
- Añadir pre-commit hooks (lint-staged, husky).

## Licencia

Define una licencia (por ejemplo, MIT) en un archivo LICENSE.

## Créditos

- Framework: Astro
- Estilos: Tailwind CSS
- Iconos: Iconify (astro-icon)

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

