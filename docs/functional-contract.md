# Contrato Funcional por Modulo

Version: `v1.0`  
Fecha: `2026-02-11`  
Estado: `Base operativa`

## 1) Plancheta
### Objetivo
Emitir inventario por establecimiento/sector en formato formal (preview, Excel, PDF) y en version compacta sin graficos, con texto ministerial, firmas y opcion de historial por asset.

### Entradas
- `institutionId` (filtro UI)
- `establishmentId` (obligatorio para consulta/export)
- `dependencyId` (opcional, alias UI/compat: `sectorId`)
- `includeHistory` (`true|false`)
- `responsibleName` (firma 1)
- `chiefName` (firma 2)
- `ministryText` (glosa formal)

### Salidas
- JSON preview: `count`, `meta`, `items`
- Excel: plancheta con datos, firmas, glosa y (opcional) historial
- PDF: plancheta ministerial con firmas y (opcional) historial
- Excel/PDF compacta: formato resumido sin graficos, optimizado para impresion en una hoja

### Errores esperados
- `400` filtros invalidos o incompletos
- `404` sin assets para exportar
- `403` fuera de alcance segun rol

### Reglas de negocio
- Solo assets activos (`isDeleted=false`)
- Si no hay `dependencyId` ni `sectorId`, consulta por todo el establecimiento
- Respeta alcance por rol
- Texto ministerial y firmas deben ser parametrizables
- La version compacta no debe incluir graficos ni bloques gerenciales pesados

### Criterios de aceptacion
- Given un establecimiento con assets activos, When previsualizo, Then obtengo `count > 0` y `items`.
- Given `sectorId` o `dependencyId`, When exporto PDF, Then el documento solo incluye ese sector.
- Given `includeHistory=true`, When previsualizo/exporto, Then cada asset incluye resumen de movimientos recientes.
- Given un filtro sin resultados, When exporto, Then recibo `404` con mensaje claro.

## 2) Transfer
### Objetivo
Mover assets entre establecimiento/sector (misma institucion) con trazabilidad completa y evidencia obligatoria.

### Entradas
- `assetId`
- `toEstablishmentId`
- `toDependencyId`
- `reasonCode` (catalogado)
- Evidencia obligatoria: `file`, `docType`, `note` (opcional)

### Salidas
- Asset actualizado
- `movementId` del movimiento `TRANSFER`
- Evidencia vinculada al movimiento

### Errores esperados
- `403` usuario no autorizado
- `409` mismo destino o asset en baja
- `400` datos destino invalidos, razon invalida, evidencia faltante/invalida

### Reglas de negocio
- Solo `ADMIN_CENTRAL` puede transferir
- No se permite cruce de institucion
- `reasonCode` obligatorio y validado contra catalogo
- Evidencia obligatoria y asociada al movimiento en transaccion

### Criterios de aceptacion
- Given transferencia valida, When confirmo, Then cambia establecimiento/sector y se registra `movementId`.
- Given mismo destino actual, When transfiero, Then recibo `409`.
- Given sin evidencia, When transfiero, Then recibo `400` con `EVIDENCE_REQUIRED`.

## 3) Baja / Restore
### Objetivo
Gestionar ciclo de vida de assets (baja y restauracion) con causal estructurada y evidencia en movimientos sensibles.

### Entradas
- Baja (`status`): `assetStateId`, `reasonCode`, evidencia obligatoria si estado destino es `BAJA`
- Restore: `assetStateId` opcional, `reasonCode` obligatorio, evidencia obligatoria

### Salidas
- Asset actualizado (`isDeleted` true/false)
- `movementId`
- Historial con `reasonCode`

### Errores esperados
- `400` razon faltante/invalida, evidencia faltante/invalida
- `409` estado conflictivo
- `404` asset/estado inexistente

### Reglas de negocio
- No restaurar a estado `BAJA`
- No cambiar a mismo estado
- Restore solo para assets dados de baja
- Trazabilidad obligatoria por movimiento

### Criterios de aceptacion
- Given baja valida, When ejecuto, Then `isDeleted=true` y hay movimiento con `reasonCode`.
- Given restore valido, When ejecuto, Then `isDeleted=false` y hay movimiento con `reasonCode`.
- Given status a `BAJA` sin evidencia, When ejecuto, Then recibo `400`.

## 3.5) Cierre Anual de Depreciacion
### Objetivo
Generar y guardar el cierre anual de depreciacion al `31-12` por institucion, manteniendo un libro historico de corridas.

### Entradas
- `fiscalYear`

### Salidas
- Resumen del cierre: `id`, `institutionId`, `fiscalYear`, `closingDate`, `closedAt`, `closedBy`, `totalAssets`, `totalAnnualDepreciation`, `totalClosingBookValue`, `itemsCount`
- Listado de corridas recientes para consulta operativa

### Errores esperados
- `400` año fiscal inválido o sin activos elegibles
- `403` rol insuficiente
- `409` ya existe un cierre para el mismo año fiscal en la misma institución
- `409` el año fiscal aún no es cerrable porque no ha comenzado el siguiente año calendario

### Reglas de negocio
- Solo `ADMIN_CENTRAL` ejecuta el cierre.
- El cierre se calcula al `31-12` del año fiscal pedido.
- El cierre de un año `Y` solo se habilita desde el `01-01-(Y+1)`.
- El proceso usa el inventario activo de la institucion y guarda snapshots por asset.
- Si ya hay una corrida para ese año fiscal, no se duplica.

### Criterios de aceptacion
- Given un año fiscal válido y activos elegibles, When cierro, Then recibo `201` con el resumen del cierre.
- Given un cierre existente para el mismo año fiscal, When cierro de nuevo, Then recibo `409`.
- Given el año fiscal actual aún no terminó, When intento cerrarlo antes del `01-01` siguiente, Then recibo `409`.
- Given un usuario no central, When intenta cerrar, Then recibe `403`.

## 4) Importaciones
### Objetivo
Permitir carga masiva controlada de catalogo y assets con reporte de calidad y deduplicacion.

### Entradas
- Archivo Excel (`.xlsx`) por modulo
- Campos obligatorios segun esquema

### Salidas
- Resumen: `createdCount`, `skippedCount`, `errorCount`
- Detalle por fila (`created/skipped/errors`)
- Historial de importaciones

### Errores esperados
- `400` archivo ausente/esquema invalido
- `413` payload excedido
- Errores por fila sin detener todo el lote (segun politica)

### Reglas de negocio
- Deduplicacion definida (llave oficial o compuesta)
- Validacion de relaciones activas
- Fechas y valores en rangos validos
- Reporte descargable de errores/saltos

### Criterios de aceptacion
- Given archivo valido, When importo, Then recibo resumen con `createdCount > 0`.
- Given filas duplicadas, When importo, Then quedan en `skipped` con razon.
- Given filas invalidas, When importo, Then quedan en `errors` con detalle.

## 5) Usuarios
### Objetivo
Administrar usuarios por rol, alcance y estado operativo (activo/inactivo).

### Entradas
- Crear/editar/desactivar
- Listar con filtros: `q`, `roleType`, `institutionId`, `establishmentId`, `includeInactive`

### Salidas
- Usuario creado/actualizado/desactivado
- Listados paginados
- Estado `isActive`

### Errores esperados
- `400` datos invalidos
- `401` sesion/credenciales invalidas
- `403` permiso insuficiente
- `409` conflicto (`email` duplicado, ya inactivo)

### Reglas de negocio
- `ADMIN_CENTRAL` administra global
- Usuarios inactivos no pueden login/refresh
- Alcance condicionado por rol y establecimiento

### Criterios de aceptacion
- Given usuario nuevo valido, When creo, Then obtengo `201` con datos de usuario.
- Given usuario inactivo, When intenta login, Then obtiene `401`.
- Given listado con `includeInactive=true`, When consulto, Then aparecen activos e inactivos.

## 6) Auditoria
### Objetivo
Mantener trazabilidad verificable de acciones administrativas y accesos.

### Entradas
- Filtros por entidad, accion, fecha, usuario, email, resultado

### Salidas
- Eventos auditables (`AdminAudit`, `LoginAudit`)
- Metricas y exportes

### Errores esperados
- `400` filtros invalidos
- `403` acceso no autorizado

### Reglas de negocio
- Registrar eventos de alta relevancia (create/update/delete/deactivate, login success/fail)
- Mantener respuesta estable para UI (`error`, `code`, `details` cuando aplique)
- Exportes deben respetar filtros activos

### Criterios de aceptacion
- Given acciones admin, When consulto auditoria, Then aparecen eventos con entidad, accion, usuario y fecha.
- Given filtro por entidad/accion, When exporto, Then el archivo contiene solo ese subconjunto.

## Politica de cambios
- Todo cambio funcional debe actualizar este contrato.
- Todo modulo requiere:
- prueba automatizada critica o justificativo documentado.
- prueba manual guiada con resultado `PASS/FAIL`.
- commit limpio y trazable.
