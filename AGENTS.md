# Finanzas Lit

Aplicacion de escritorio para finanzas personales construida con Electron, React,
TypeScript y Vite. Es una aplicacion de una sola persona y guarda toda la
informacion en SQLite dentro del equipo.

## Arquitectura

- El renderer React presenta datos y captura formularios.
- El preload expone un bridge minimo y tipado.
- El proceso principal valida entradas, aplica las reglas financieras y accede a
  `better-sqlite3`.
- `electron/local-db.ts` inicializa el esquema y la conexion.
- `electron/local-service.ts` contiene validacion, consultas y reglas de negocio.
- `src/api/client.ts` conserva una interfaz uniforme para los controladores, pero
  envia las operaciones exclusivamente por IPC.
- No se usa la red para leer o escribir informacion financiera.

## Stack y restricciones

- pnpm es el unico gestor de paquetes permitido en este proyecto.
- Usar siempre `pnpm install`, `pnpm run <script>` y `pnpm exec <comando>`.
- No ejecutar `npm`, `npx`, `yarn` ni generar archivos de bloqueo de otros
  gestores.
- Mantener `ignoreScripts: true` en `pnpm-workspace.yaml`: ninguna dependencia
  puede ejecutar automaticamente `preinstall`, `install` ni `postinstall`.
- Mantener `verifyDepsBeforeRun: error`: `pnpm run` y `pnpm exec` deben fallar si
  las dependencias estan desactualizadas, nunca ejecutar una instalacion
  implicita.
- No agregar scripts de ciclo de vida automaticos al proyecto ni aprobar builds
  con `allowBuilds`, `onlyBuiltDependencies` o
  `dangerouslyAllowAllBuilds`.
- La reconstruccion para Electron solo puede iniciarse manualmente con
  `pnpm run rebuild:native` y con autorizacion expresa del usuario.
- React con componentes funcionales y hooks.
- TypeScript en modo estricto.
- CSS nativo con BEM y tokens de `src/styles/variables.css`.
- Recharts para graficas y Lucide para iconos.
- SQLite mediante `better-sqlite3`.
- No agregar librerias, frameworks CSS, ORM, cliente HTTP o gestor de estado sin
  autorizacion explicita.

## Convenciones

- Identificadores y comentarios de codigo en ingles; interfaz en español.
- Componentes y tipos en PascalCase; funciones y variables en camelCase.
- Tablas y columnas SQLite en snake_case.
- Componentes con exports nombrados.
- Una responsabilidad principal por archivo.
- No usar estilos inline salvo valores realmente dinamicos.
- Importes de interfaz con
  `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.

## Reglas financieras

- Los montos se almacenan en SQLite como centavos enteros.
- Los valores que cruzan el bridge usan `number` y se convierten a centavos solo
  en el proceso principal.
- Toda operacion que afecte saldos debe ser atomica.
- Un gasto reduce una cuenta o aumenta la deuda de una tarjeta.
- Un ingreso aumenta una cuenta.
- Los pagos y movimientos entre instrumentos son transferencias.
- MSI solo aplica a compras con tarjeta a 3, 6, 9, 12, 18 o 24 meses.
- Los calculos de MSI, amortizacion, saldos, presupuestos, estados de cuenta y
  simulaciones ocurren en el proceso principal, nunca en el renderer.

## SQLite

- Activar siempre claves foraneas y modo WAL.
- Usar consultas preparadas y parametros para todos los valores.
- No interpolar entradas del usuario en SQL.
- Los nombres dinamicos internos deben pasar por una lista cerrada.
- Mantener indices para filtros y relaciones frecuentes.
- Cerrar la conexion durante el cierre de la aplicacion.
- El archivo debe tener permisos restrictivos para el usuario actual.

## IPC y Electron

- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` y
  `sandbox: true` son obligatorios.
- El renderer no puede acceder a Node.js, SQLite, `fs`, `child_process` ni APIs
  del sistema.
- Exponer solo canales necesarios y definidos como constantes.
- Tratar cualquier argumento IPC como entrada no confiable.
- Validar tipos, rangos, longitudes, fechas, enumeraciones y relaciones antes de
  ejecutar una consulta.
- Mantener una politica de seguridad de contenido restrictiva.

## Manejo de errores

- Todas las operaciones de datos deben devolver
  `{ success: boolean, data?: T, error?: string }`.
- Mostrar el error al usuario; nunca fallar silenciosamente.
- No exponer SQL, rutas internas, stack traces ni detalles del sistema.
- Registrar solo contexto tecnico que no contenga datos financieros sensibles.

## Calidad

- No refactorizar areas ajenas a la solicitud.
- No agregar funcionalidades no solicitadas.
- Evitar sobreingenieria.
- Los comentarios explican el porqué, no describen lo obvio.
- Ejecutar `pnpm run check` al terminar.
- `pnpm run test:local` debe validar operaciones y saldos contra una base temporal.

## Analisis de seguridad obligatorio

Despues de cada implementacion verificar:

- Consultas preparadas y ausencia de interpolacion de entradas en SQL.
- Validacion completa en el proceso principal.
- Canales IPC minimos y argumentos validados.
- Protecciones de Electron intactas.
- Calculos financieros fuera del renderer.
- Errores sin detalles internos.
- Ausencia de nuevas dependencias no autorizadas.
- Scripts de instalacion de dependencias bloqueados por pnpm.
- Ausencia de comunicacion de red para datos financieros.
