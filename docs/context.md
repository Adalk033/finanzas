# Contexto tecnico

Finanzas Lit es una aplicacion de escritorio de una sola persona. El renderer usa
React y no tiene acceso a Node.js ni al sistema de archivos. El proceso principal
de Electron concentra la validacion, las reglas financieras y el acceso a SQLite.

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
