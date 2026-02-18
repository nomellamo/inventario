# Runbook de Incidentes

## Objetivo
Resolver rapido incidentes operativos frecuentes sin perder trazabilidad.

## 1) Falla en importacion de catalogo

### Sintoma
- El endpoint `/admin/catalog-items/import/excel` responde con `errorCount > 0` o HTTP 4xx/5xx.

### Acciones
1. Revisar en UI:
- `createdCount`, `skippedCount`, `errorCount`.
- Descargar `catalog_import_errors.csv`.

2. Verificar formato del Excel:
- Cabeceras validas:
  - Plantilla: `officialKey,name,category,...`
  - Inventario avanzado: `CODIGO_ACTIVO,CARACTERISTICAS,...`
- Confirmar que cada fila tenga al menos `name` y `category`.

3. Reintentar importacion:
- Corregir filas con error.
- Mantener `officialKey` consistente cuando exista codigo institucional.

### Escalamiento tecnico
1. Revisar logs API del endpoint.
2. Ejecutar prueba critica:
```bash
npm test
```
3. Si persiste, abrir incidente con archivo de error CSV y timestamp.

## 2) Duplicado de officialKey

### Sintoma
- Error de conflicto al crear/editar/importar item de catalogo.
- Mensaje tipo: `CatalogItem duplicado por officialKey`.

### Acciones
1. Buscar el `officialKey` en la UI de catalogo.
2. Confirmar si el codigo corresponde al mismo bien catalogado.
3. Decidir:
- Si es el mismo: actualizar item existente (no crear otro).
- Si no es el mismo: corregir codigo en origen (Excel o formulario).

### Prevencion
- No reutilizar codigos oficiales.
- Mantener naming estable y codigos unicos por item institucional.

## 3) Error en migracion Prisma

### Sintoma
- `npx prisma migrate deploy` falla.

### Acciones
1. Verificar conectividad DB y credenciales de `.env`.
2. Reintentar:
```bash
npx prisma migrate deploy
npx prisma generate
```
3. Ejecutar check completo:
```bash
npm run release:check
```

### Si sigue fallando
1. No desplegar.
2. Revisar tabla `_prisma_migrations` y estado de la migracion fallida.
3. Escalar con:
- nombre de migracion,
- error exacto,
- entorno afectado,
- timestamp.

## Criterio de cierre
Un incidente se considera cerrado cuando:
1. El flujo vuelve a operar.
2. `npm run release:check` pasa.
3. Se registra causa raiz y accion preventiva.
