# Finanzas Lit

Aplicacion de escritorio para gestion financiera personal con Electron + React + TypeScript + Vite.

## Requisitos

- Node.js 24+
- npm 10+

## Desarrollo

1. Instalar dependencias:

```bash
npm ci
```

2. Ejecutar la app de Electron en modo desarrollo:

```bash
npm run dev
```

Este comando:

- compila el proceso main/preload de Electron,
- levanta Vite para renderer,
- abre la ventana de Electron (no solo navegador web).

Si necesitas levantar solo el frontend web:

```bash
npm run dev:web
```

## Scripts principales

- `npm run dev`: desarrollo completo Electron + renderer.
- `npm run dev:web`: solo Vite web.
- `npm run build`: build renderer + build electron typescript.
- `npm run electron`: compila main/preload y ejecuta la app desktop desde build local.
- `npm run electron:build`: genera paquetes instalables con electron-builder.
- `npm run lint`: ejecuta eslint.

## Empaquetado desktop

Genera instaladores en `release/`:

```bash
npm run electron:build -- --win --x64 --publish never
npm run electron:build -- --mac --x64 --publish never
```

## CI/CD Release

El workflow [Build and Release Desktop](.github/workflows/windows-release.yml) empaqueta Windows + macOS en el mismo pipeline y publica un unico release con ambos artefactos.

Incluye:

- `.exe` para Windows
- `.dmg` y `.zip` para macOS
