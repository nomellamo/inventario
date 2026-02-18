# API - Inventario

Base URL: `http://localhost:3000`

## Resumen por rol

### ADMIN_CENTRAL
- Acceso total a assets.
- Puede transferir entre establecimientos.
- Puede ver auditoria global (`/audit`) y auditoria de assets (`/audit/assets`).

### ADMIN_ESTABLISHMENT
- Puede crear, mover y cambiar estado de assets dentro de su establecimiento.
- No puede transferir entre establecimientos.
- Puede ver auditoria de assets solo dentro de su establecimiento.

### VIEWER
- Solo lectura.
- No puede crear, mover ni cambiar estado.

## Errores comunes

- `400` Validacion fallida (parametros o body invalidos).
- `401` No autorizado (token invalido o ausente).
- `403` Prohibido (rol o alcance insuficiente).
- `404` No encontrado.
- `409` Conflicto (por ejemplo, asset ya en esa dependencia).
- `500` Error interno.

## Auth

### POST `/auth/login`
Body:
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```
Response:
```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "name": "User",
    "role": "ADMIN_CENTRAL",
    "establishmentId": 3
  }
}
```

## Assets

### POST `/assets`
Roles: `ADMIN_CENTRAL`, `ADMIN_ESTABLISHMENT`

Body:
```json
{
  "catalogItemId": 10,
  "establishmentId": 3,
  "dependencyId": 10,
  "assetStateId": 1,
  "name": "Notebook",
  "brand": "Lenovo",
  "modelName": "X1",
  "serialNumber": "SN-001",
  "accountingAccount": "ACC-001",
  "analyticCode": "AN-001",
  "acquisitionValue": 100000,
  "acquisitionDate": "2026-02-10T12:00:00.000Z"
}
```
Notas:
- `name` es opcional si se entrega `catalogItemId`.
Response:
```json
{
  "id": 123,
  "internalCode": 95001,
  "name": "Notebook",
  "brand": "Lenovo",
  "modelName": "X1",
  "serialNumber": "SN-001",
  "accountingAccount": "ACC-001",
  "analyticCode": "AN-001",
  "acquisitionValue": 100000,
  "acquisitionDate": "2026-02-10T12:00:00.000Z",
  "assetTypeId": 1,
  "assetStateId": 1,
  "establishmentId": 3,
  "dependencyId": 10,
  "createdAt": "2026-02-10T12:01:00.000Z"
}
```

### GET `/assets`
Query:
- `q`, `institutionId`, `establishmentId`, `dependencyId`, `assetStateId`
- `assetType`, `brand`, `modelName`, `serialNumber`, `internalCode`
- `minValue`, `maxValue`, `fromDate`, `toDate`
- `sortBy`, `sortOrder`, `take`, `skip`, `withCount` (por defecto false)

Response:
```json
{
  "total": 120,
  "skip": 0,
  "take": 20,
  "items": [
    {
      "id": 123,
      "internalCode": 95001,
      "name": "Notebook",
      "assetType": { "id": 1, "name": "FIXED" },
      "assetState": { "id": 1, "name": "BUENO" },
      "establishment": { "id": 3, "name": "Establecimiento 3" },
      "dependency": { "id": 10, "name": "Sala 1" }
    }
  ]
}
```
### GET `/assets/:id`

### GET `/assets/:id/history`
Response:
```json
{
  "assetId": 123,
  "count": 2,
  "movements": [
    {
      "id": 1,
      "type": "INVENTORY_CHECK",
      "fromDependencyId": null,
      "toDependencyId": 10,
      "createdAt": "2026-02-10T12:01:00.000Z"
    }
  ]
}
```

### PUT `/assets/:id/relocate`
Body:
```json
{ "toDependencyId": 20 }
```

### PUT `/assets/:id/status`
Body:
```json
{ "assetStateId": 2 }
```

### PUT `/assets/:id/transfer`
Roles: `ADMIN_CENTRAL`
Body:
```json
{ "toEstablishmentId": 5, "toDependencyId": 30 }
```

### GET `/assets/export/excel`

### GET `/assets/export/pdf`

### GET `/assets/import/template/excel`

### POST `/assets/import/excel`
Form-data:
- `file`: Excel
Response:
```json
{
  "createdCount": 10,
  "errorCount": 2,
  "errors": [
    { "row": 3, "error": "Datos requeridos incompletos o invalidos" }
  ]
}
```

### GET `/assets/imports`
Response:
```json
{
  "total": 2,
  "skip": 0,
  "take": 20,
  "items": [
    {
      "id": 1,
      "filename": "import.xlsx",
      "status": "COMPLETED",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "createdCount": 10,
      "errorCount": 0
    }
  ]
}
```

### GET `/assets/imports/export/excel`

### GET `/assets/imports/export/pdf`

## Planchetas

### GET `/planchetas`
Query: `dependencyId` o `establishmentId`
Response:
```json
{
  "count": 2,
  "items": [
    {
      "internalCode": 95001,
      "name": "Notebook",
      "brand": "Lenovo",
      "assetState": { "name": "BUENO" }
    }
  ]
}
```

### GET `/planchetas/excel`
Query: `dependencyId` o `establishmentId`

### GET `/planchetas/pdf`
Query: `dependencyId` o `establishmentId`

### GET `/planchetas/:id/history`

## Auditoria

### GET `/audit`
Roles: `ADMIN_CENTRAL`
Query: `assetId`, `userId`, `type`, `fromDate`, `toDate`, `q`, `take`, `skip`, `sortOrder`

### GET `/audit/assets`
Roles: `ADMIN_CENTRAL`, `ADMIN_ESTABLISHMENT`
Query: `assetId`, `userId`, `action`, `fromDate`, `toDate`, `q`, `take`, `skip`, `sortOrder`

## Catalogo

### GET `/catalog/items`
Query:
- `q`, `category`, `subcategory`, `brand`, `modelName`, `take`, `skip`
Response:
```json
{
  "total": 10,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 10, "name": "Notebook", "category": "TIC", "subcategory": "Computacion" }
  ]
}
```

### GET `/catalog/institutions`
Response:
```json
{
  "total": 1,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 1, "name": "SLEP Cordillera", "createdAt": "2026-02-10T10:00:00.000Z" }
  ]
}
```

### GET `/catalog/establishments`
Response:
```json
{
  "total": 1,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 3, "name": "Establecimiento 3", "type": "SCHOOL", "institutionId": 1 }
  ]
}
```

### GET `/catalog/dependencies`
Response:
```json
{
  "total": 2,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 10, "name": "Sala 1", "establishmentId": 3 },
    { "id": 11, "name": "Sala 2", "establishmentId": 3 }
  ]
}
```

### GET `/catalog/asset-states`
Response:
```json
{
  "total": 2,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 1, "name": "BUENO" },
    { "id": 2, "name": "MALO" }
  ]
}
```

### GET `/catalog/asset-types`
Response:
```json
{
  "total": 2,
  "skip": 0,
  "take": 20,
  "items": [
    { "id": 1, "name": "FIXED" },
    { "id": 2, "name": "CONTROL" }
  ]
}
```

## Admin (solo ADMIN_CENTRAL)

### GET `/admin/users`
Query:
- `q`, `institutionId`, `establishmentId`, `roleType`, `includeInactive`, `take`, `skip`

### POST `/admin/users`
Body:
```json
{
  "name": "Admin Escuela 2",
  "email": "escuela2@cordillera.local",
  "password": "Password123",
  "roleType": "ADMIN_ESTABLISHMENT",
  "establishmentId": 3
}
```
Notas:
- `roleType` permite: `ADMIN_CENTRAL`, `ADMIN_ESTABLISHMENT`, `VIEWER`.
- Para `ADMIN_ESTABLISHMENT` y `VIEWER`, `establishmentId` es requerido.
- Para `ADMIN_CENTRAL`, no enviar `establishmentId`; usar `institutionId`.

### PUT `/admin/users/:id`
Body (campos opcionales):
```json
{
  "name": "Nuevo Nombre",
  "roleType": "VIEWER",
  "establishmentId": 3
}
```

### DELETE `/admin/users/:id`
Desactiva usuario (soft delete por `isActive=false`).

### POST `/admin/dependencies/bulk`
Body:
```json
{
  "items": [
    { "name": "Sala 1", "establishmentId": 3 },
    { "name": "Sala 2", "establishmentId": 3 }
  ]
}
```

### POST `/admin/catalog-items/bulk`
Body:
```json
{
  "items": [
    {
      "name": "Mesa redonda reuniones",
      "category": "Mobiliario",
      "subcategory": "Mesas",
      "brand": "Genetica",
      "modelName": "STD",
      "description": "Mesa redonda para reuniones",
      "unit": "unidad"
    }
  ]
}
```

### POST `/admin/establishments/bulk`
Body:
```json
{
  "items": [
    {
      "name": "Liceo Central",
      "type": "LICEO",
      "rbd": "12345",
      "commune": "San Carlos",
      "institutionId": 1
    }
  ]
}
```

### GET `/admin/catalog-items/import/template/excel`
Descarga plantilla base para carga masiva de catalogo.

### POST `/admin/catalog-items/import/excel`
Form-data:
- `file`: Excel `.xlsx`

Formatos soportados:
- Estandar catalogo: `name, category, subcategory, brand, modelName, description, unit`
- Formato inventario avanzado: `CATEGORIA, TIPO, MARCA, MODELO, OBSERVACIONES` (mapea a catalogo)

Response:
```json
{
  "filename": "INVENTARIO_PUBLICO_CHILE_AVANZADO_2200.xlsx",
  "totalRows": 2200,
  "parsedCount": 2200,
  "createdCount": 1800,
  "skippedCount": 400,
  "errorCount": 0,
  "errors": [],
  "skipped": [],
  "items": []
}
```
Response:
```json
{
  "createdCount": 1,
  "skippedCount": 0,
  "skipped": [],
  "items": [
    { "id": 20, "name": "Liceo Central", "institutionId": 1 }
  ]
}
```
Response:
```json
{
  "createdCount": 1,
  "skippedCount": 0,
  "skipped": [],
  "items": [
    { "id": 100, "name": "Mesa redonda reuniones", "category": "Mobiliario" }
  ]
}
```
Response:
```json
{
  "createdCount": 2,
  "skippedCount": 0,
  "skipped": [],
  "items": [
    { "id": 10, "name": "Sala 1", "establishmentId": 3 },
    { "id": 11, "name": "Sala 2", "establishmentId": 3 }
  ]
}
```
Response:
```json
{
  "total": 50,
  "skip": 0,
  "take": 20,
  "items": [
    {
      "id": 10,
      "type": "RELOCATION",
      "assetId": 123,
      "createdAt": "2026-02-10T12:10:00.000Z",
      "user": { "id": 1, "name": "Admin Central" }
    }
  ]
}
```
Response:
```json
{
  "total": 5,
  "skip": 0,
  "take": 20,
  "items": [
    {
      "id": 1,
      "action": "CREATE",
      "assetId": 123,
      "before": null,
      "after": { "name": "Notebook", "dependencyId": 10 },
      "createdAt": "2026-02-10T12:01:00.000Z",
      "user": { "id": 1, "name": "Admin Central" }
    }
  ]
}
```
