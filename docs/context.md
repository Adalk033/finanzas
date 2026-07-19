# Contexto tecnico

Finanzas Lit es una aplicacion de escritorio de una sola persona. El renderer usa
React y no tiene acceso a Node.js ni al sistema de archivos. El proceso principal
de Electron concentra la validacion, las reglas financieras y el acceso a SQLite.

## Memoria operativa del proyecto

- pnpm es el unico gestor de paquetes autorizado.
- No usar `npm`, `npx` ni `yarn`, incluso para ejecutar scripts o reconstruir
  dependencias nativas.
- Instalar con `pnpm install`, ejecutar scripts con `pnpm run` y herramientas con
  `pnpm exec`.
- `pnpm-workspace.yaml` mantiene `ignoreScripts: true`; durante una instalacion no
  se ejecutan scripts `preinstall`, `install` ni `postinstall` del proyecto o de
  sus dependencias.
- `verifyDepsBeforeRun: error` evita que `pnpm run` o `pnpm exec` lancen una
  instalacion implicita; si `node_modules` no esta sincronizado, el comando debe
  fallar y la instalacion se ejecuta manualmente.
- No se mantienen listas permanentes de paquetes autorizados para ejecutar
  scripts.
- Las dependencias nativas se reconstruyen para Electron solo de forma manual con
  `pnpm run rebuild:native` y despues de una autorizacion expresa del usuario.
- El archivo de bloqueo oficial es `pnpm-lock.yaml`.

## Persistencia

- Todos los datos financieros viven en `finanzas.sqlite`, dentro del directorio
  de datos de la aplicacion.
- Los importes se almacenan como centavos enteros.
- SQLite usa claves foraneas, modo WAL y transacciones atomicas para cualquier
  operacion que cambie saldos.
- El archivo se crea con permisos de lectura y escritura solo para el usuario.

## Flujo

1. Las pantallas envian una solicitud tipada al preload.
2. El preload solo expone las operaciones de base de datos permitidas.
3. El proceso principal valida tipos, rangos, fechas y relaciones.
4. La operacion se ejecuta en SQLite y devuelve una respuesta uniforme.

No existe comunicacion de red para leer o escribir informacion financiera.
