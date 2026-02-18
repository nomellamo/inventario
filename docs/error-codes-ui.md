# Error Codes UI

Tabla corta de codigos estables para manejo en frontend.

| Code | HTTP | Mensaje UI sugerido |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Datos invalidos. Revisa los campos e intenta nuevamente. |
| `REFRESH_TOKEN_REQUIRED` | 401 | Tu sesion expiro. Vuelve a iniciar sesion. |
| `UNAUTHORIZED` | 401 | No autorizado. Inicia sesion nuevamente. |
| `FORBIDDEN` | 403 | No tienes permisos para realizar esta accion. |
| `ROUTE_NOT_FOUND` | 404 | Ruta no encontrada. |
| `NOT_FOUND` | 404 | No se encontro el recurso solicitado. |
| `CONFLICT` | 409 | Conflicto de datos. Revisa los campos e intenta nuevamente. |
| `PAYLOAD_TOO_LARGE` | 413 | El archivo o payload excede el tamaño permitido. |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Formato de envio invalido. Usa application/json. |
| `RATE_LIMITED` | 429 | Demasiadas solicitudes. Intenta de nuevo en unos minutos. |
| `ASSET_IMPORT_FILE_REQUIRED` | 400 | Debes adjuntar un archivo Excel para importar activos fijos. |
| `CATALOG_IMPORT_FILE_REQUIRED` | 400 | Debes adjuntar un archivo Excel para importar catalogo. |
| `PLANCHETA_EMPTY_EXPORT` | 404 | No hay datos para exportar con los filtros actuales. |
| `INVALID_ASSET_ID` | 400 | El identificador de activo fijo no es valido. |
| `READINESS_DB_TIMEOUT` | 503 | La base de datos no respondio a tiempo. |
| `READINESS_DB_DOWN` | 503 | La base de datos no esta disponible. |
| `INTERNAL_SERVER_ERROR` | 500 | Error interno del servidor. Intenta nuevamente. |

Regla operativa:
- Mostrar `requestId` cuando exista, por ejemplo: `... (ID: 12345)`.
- Usar `code` como fuente principal para mensajes de UI.
