# Auditoria y Permisos por Rol

Este documento resume que puede ver y hacer cada rol y como usar los endpoints de auditoria.

## Roles

### ADMIN_CENTRAL
- Puede crear, mover y cambiar estado de assets.
- Puede ver auditoria global (movimientos y auditoria de assets).
- Puede ver catalogo completo (instituciones, establecimientos y dependencias).

### ADMIN_ESTABLISHMENT
- Puede crear assets solo dentro de su establecimiento.
- Puede mover assets solo dentro de su establecimiento.
- Puede cambiar estado solo dentro de su establecimiento.
- Puede ver auditoria de assets solo dentro de su establecimiento.
- No puede ver auditoria global de admin.

### VIEWER
- Solo lectura.
- No puede crear, mover ni cambiar estado.
- Puede ver planchetas y catalogo permitido por rol.

## Auditoria de movimientos (audit)

Endpoint:
- `GET /audit`

Descripcion:
- Devuelve movimientos (transferencias, reubicaciones, cambios de estado, inventario).

Permisos:
- Solo `ADMIN_CENTRAL`.

Filtros:
- `assetId`, `userId`, `type`, `fromDate`, `toDate`, `q`, `take`, `skip`, `sortOrder`.

## Auditoria de assets (asset audit)

Endpoint:
- `GET /audit/assets`

Descripcion:
- Devuelve cambios con before/after por asset (CREATE, RELOCATE, STATUS_CHANGE).

Permisos:
- `ADMIN_CENTRAL`: ve todo.
- `ADMIN_ESTABLISHMENT`: ve solo assets de su establecimiento.

Filtros:
- `assetId`, `userId`, `action`, `fromDate`, `toDate`, `q`, `take`, `skip`, `sortOrder`.

## Ejemplos rapidos

### Ver auditoria de un asset
`GET /audit/assets?assetId=123`

### Ver auditoria por accion
`GET /audit/assets?action=RELOCATE`

### Buscar por texto
`GET /audit/assets?q=notebook`
