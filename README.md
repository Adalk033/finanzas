# Finanzas Lit

Aplicacion de escritorio para gestion financiera personal con Electron + React + TypeScript + Vite.

Todos los datos se guardan en una base SQLite local. La aplicacion no requiere
cuentas, credenciales ni servicios externos.

## Requisitos

- Node.js 24+
- pnpm 11+

## Desarrollo

1. Instalar dependencias:

```bash
pnpm install --frozen-lockfile
```

La instalacion mantiene bloqueados los scripts `preinstall`, `install` y
`postinstall` del proyecto y de todas las dependencias mediante
`ignoreScripts: true`. Los comandos `pnpm run` y `pnpm exec` tampoco instalan
dependencias de forma implicita: fallan si `node_modules` no esta sincronizado.

2. Ejecutar la app de Electron en modo desarrollo:

```bash
pnpm run dev
```

Este comando:

- compila el proceso main/preload de Electron,
- levanta Vite para renderer,
- abre la ventana de Electron (no solo navegador web).

## Scripts principales

- `pnpm run dev`: desarrollo completo Electron + renderer.
- `pnpm run build`: build renderer + build electron typescript.
- `pnpm run electron:build`: genera paquetes instalables con electron-builder.
- `pnpm run lint`: ejecuta eslint.
- `pnpm run test:local`: valida operaciones y saldos contra una SQLite temporal.
- `pnpm run check`: ejecuta lint, build y la prueba local.
- `pnpm run rebuild:native`: reconstruye manualmente las dependencias nativas
  para la version instalada de Electron. Debe ejecutarse solo de forma
  intencional despues de revisar las dependencias.

## Datos locales

El archivo `finanzas.sqlite` se crea en el directorio de datos de Electron. Los
montos se guardan como centavos enteros y las operaciones que afectan saldos son
atomicas. La pantalla Settings muestra la ruta exacta del archivo en cada equipo.

La aplicacion mantiene un historial auditable:

- los saldos con movimientos se corrigen mediante conciliaciones;
- los pagos de tarjeta se distribuyen entre estados pendientes;
- los pagos de prestamos separan capital e interes y pueden revertirse;
- los gastos fijos pagados generan su movimiento financiero relacionado;
- las tarjetas de debito pueden vincularse a una cuenta para no duplicar dinero;
- suscripciones e ingresos recurrentes generan movimientos con un origen identificable.

## Respaldo e intercambio

Desde Configuracion se puede:

- crear un respaldo SQLite;
- restaurar un respaldo validado, conservando antes una copia automatica;
- exportar movimientos a CSV;
- importar el mismo formato CSV con deteccion de duplicados.

El esquema usa migraciones compatibles y actualmente reporta la version `2`.

## Empaquetado desktop

Genera instaladores en `release/`:

```bash
pnpm run electron:build -- --win --x64 --publish never
pnpm run electron:build -- --mac --x64 --publish never
```

## CI/CD Release

El workflow [Build and Release Desktop](.github/workflows/windows-release.yml) empaqueta Windows + macOS en el mismo pipeline y publica un unico release con ambos artefactos.

Incluye:

- `.exe` para Windows
- `.dmg` y `.zip` para macOS
