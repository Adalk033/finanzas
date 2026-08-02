# Finanzas Lit

Aplicacion de escritorio para gestionar finanzas personales desde un solo
lugar. Esta construida con Electron, React, TypeScript, Vite y SQLite.

Todos los datos se almacenan localmente en el equipo. Finanzas Lit no requiere
cuentas, credenciales ni servicios externos para leer o escribir informacion
financiera.

## Funcionalidades

- Resumen con saldos, flujo de efectivo, evolucion del patrimonio, gastos por
  categoria, compromisos proximos y proyecciones de gastos.
- Registro de ingresos, gastos y movimientos con categorias, subcategorias y
  filtros.
- Presupuestos, gastos fijos, suscripciones, ingresos recurrentes y
  recordatorios con notificaciones de escritorio.
- Gestion de bancos, cuentas, tarjetas de debito y tarjetas de credito, con
  conciliaciones y relaciones entre instrumentos.
- Transferencias entre instrumentos, estados de cuenta y pagos de tarjetas.
- Compras a meses sin intereses (MSI) a 3, 6, 9, 12, 18 o 24 meses.
- Prestamos con amortizacion, pagos de capital e interes y posibilidad de
  revertir pagos.
- Vista familiar para consultar y registrar gastos por mes.
- Metas de ahorro, simuladores de MSI y prestamos.
- Respaldos y restauracion de la base SQLite, ademas de exportacion e
  importacion de movimientos en CSV.

## Requisitos

- Node.js 24+
- pnpm 11+

El proyecto usa pnpm como unico gestor de paquetes y conserva el archivo de
bloqueo `pnpm-lock.yaml`.

## Desarrollo

1. Instalar o sincronizar dependencias manualmente:

```bash
pnpm install --frozen-lockfile
```

La instalacion mantiene bloqueados los scripts `preinstall`, `install` y
`postinstall` del proyecto y de todas las dependencias mediante
`ignoreScripts: true`. Los comandos `pnpm run` y `pnpm exec` tampoco instalan
dependencias de forma implicita: fallan si `node_modules` no esta sincronizado.

2. Ejecutar la aplicacion de Electron en modo desarrollo:

```bash
pnpm run dev
```

Este comando:

- compila el proceso principal y el preload de Electron;
- levanta Vite para el renderer;
- abre la ventana de Electron, no solo un navegador web.

> `pnpm-workspace.yaml` mantiene `ignoreScripts: true` y
> `verifyDepsBeforeRun: error`. Por eso los comandos no ejecutan scripts de
> instalacion de dependencias ni instalan paquetes de forma implicita.

## Scripts principales

- `pnpm run dev`: desarrollo completo Electron + renderer.
- `pnpm run build`: build renderer + build electron typescript.
- `pnpm run electron:build`: genera paquetes instalables con electron-builder.
- `pnpm run lint`: ejecuta eslint.
- `pnpm run test:local`: valida operaciones y saldos contra una SQLite temporal.
- `pnpm run check`: ejecuta lint, build y la prueba local.
- `pnpm run rebuild:native`: reconstruye manualmente las dependencias nativas
  para la version instalada de Electron. Debe ejecutarse solo de forma
  intencional y con autorizacion expresa despues de revisar las dependencias.

## Datos locales

El archivo `finanzas.sqlite` se crea en el directorio de datos de Electron. Los
montos se guardan como centavos enteros y las operaciones que afectan saldos son
atomicas. La pantalla Settings muestra la ruta exacta del archivo en cada equipo.

SQLite usa claves foraneas y modo WAL. El archivo y sus archivos auxiliares se
crean con permisos restrictivos para el usuario actual.

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

## Arquitectura y privacidad

- React captura la informacion y presenta los datos, sin acceso a Node.js,
  SQLite ni al sistema de archivos.
- El preload expone un bridge tipado y minimo mediante IPC.
- El proceso principal valida las entradas, aplica las reglas financieras y
  ejecuta las consultas preparadas de SQLite.
- No se usa red para leer o escribir informacion financiera.

Las operaciones que modifican saldos se ejecutan de forma atomica y los errores
se devuelven con mensajes aptos para la interfaz, sin exponer SQL, rutas
internas ni trazas.

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

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
