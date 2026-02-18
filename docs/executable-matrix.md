# Matriz Ejecutable por Riesgo

Version: `v1.0`  
Fecha: `2026-02-11`  
Fuente: `docs/functional-contract.md`

## Prioridad Global (riesgo)
| Prioridad | Criterio | Modulos |
|---|---|---|
| P0 | Impacta trazabilidad, seguridad legal o continuidad operativa | Transfer, Baja/Restore, Auditoria |
| P1 | Impacta calidad de datos y operación diaria | Importaciones, Usuarios |
| P2 | Impacta reporting y formalidad documental | Plancheta |

## Orden recomendado de ejecucion
1. `P0`: Transfer + Baja/Restore + Auditoria (cerrar reglas y errores estables).
2. `P1`: Importaciones + Usuarios (calidad de datos y gobernanza).
3. `P2`: Plancheta ministerial (salida formal y presentación).

---

## Transfer (P0)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `assetId` | Si | Entero positivo, asset existente | Assets > Lista > Transferir | `PUT /assets/:id/transfer` | API: transfer OK/409/404 |
| `toEstablishmentId` | Si | Entero positivo, activo, misma institucion | Modal Transferir | `PUT /assets/:id/transfer` | UI: bloqueo sin establecimiento |
| `toDependencyId` | Si | Entero positivo, activa, pertenece a establecimiento destino | Modal Transferir | `PUT /assets/:id/transfer` | UI: bloqueo sin dependencia |
| `reasonCode` | Si | Catalogado (`/assets/reason-codes`) | Modal Transferir | `PUT /assets/:id/transfer` | API: `INVALID_REASON_CODE` |
| `docType` | Si | `FOTO|ACTA|FACTURA|OTRO` | Modal Transferir | `PUT /assets/:id/transfer` | API: `INVALID_EVIDENCE_DOC_TYPE` |
| `file` | Si | MIME permitido (`pdf/jpg/png`) y tamaño max | Modal Transferir | `PUT /assets/:id/transfer` | API: `EVIDENCE_REQUIRED` |
| `note` | No | String acotado | Modal Transferir | `PUT /assets/:id/transfer` | UI/API smoke |

## Baja / Restore (P0)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `assetStateId` (baja) | Si | Entero positivo, estado existente | Modal Dar de baja | `PUT /assets/:id/status` | API/UI: mismo estado => conflicto |
| `reasonCode` (baja) | Si | Catalogado `STATUS_CHANGE` | Modal Dar de baja | `PUT /assets/:id/status` | API: `MISSING_REASON_CODE`/`INVALID_REASON_CODE` |
| `docType`/`file` (baja) | Si cuando estado destino=`BAJA` | DocType y MIME validos | Modal Dar de baja | `PUT /assets/:id/status` | API: `EVIDENCE_REQUIRED` |
| `assetStateId` (restore) | No | Si viene, no puede ser `BAJA` | Basurero > Restaurar | `PUT /assets/:id/restore` | API: restore a BAJA => 400 |
| `reasonCode` (restore) | Si | Catalogado `RESTORE` | Basurero > Restaurar | `PUT /assets/:id/restore` | API: reasonCode obligatorio |
| `docType`/`file` (restore) | Si | DocType y MIME validos | Basurero > Restaurar | `PUT /assets/:id/restore` | API: `EVIDENCE_REQUIRED` |

## Auditoria (P0)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `entityType` | No | Enum valido | Auditoria Admin | `GET /admin/audit` | API: filtro por entidad |
| `action` | No | Enum valido | Auditoria Admin | `GET /admin/audit` | API: filtro por accion |
| `email/success` | No | Formato email/boolean | Login Audit | `GET /admin/login-audit` | API: filtros combinados |
| `code` en errores | Si (contrato) | No nulo en conflictos relevantes | UI global errores | Todas respuestas de error | Suite: validar `body.code` estable |

## Importaciones (P1)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `file` catalogo | Si | `.xlsx`, tamaño max | Catalogo > Importar | `POST /admin/catalog-items/import/excel` | API: 400 sin archivo |
| `officialKey` | No (recomendado) | Unico si informado | Alta/edición catalogo | `POST/PUT /admin/catalog-items` | API: `CATALOG_ITEM_DUPLICATE_OFFICIAL_KEY` |
| Dedupe compuesto | Si (regla) | `name+category+subcategory+brand+modelName` | Importar catalogo | Import catalogo | Suite: skipped por composite |
| `file` assets | Si | `.xlsx`, esquema válido | Carga masiva assets | `POST /assets/import/excel` | API: resumen created/errors |
| Relaciones (IDs) | Si | Establecimiento/dependencia/estado/tipo existentes y activos | Importar assets | Import assets | Fila invalida -> error por fila |

## Usuarios (P1)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `name` | Si | String no vacio | Usuarios > Crear/Editar | `POST/PUT /admin/users` | API/UI validación |
| `email` | Si | Formato email y unico | Usuarios > Crear/Editar | `POST/PUT /admin/users` | API: conflicto email |
| `password` | Si en create | Politica minima | Usuarios > Crear | `POST /admin/users` | API/UI create |
| `roleType` | Si | Enum de roles | Usuarios > Crear/Editar | `POST/PUT /admin/users` | API: rol inválido |
| `institutionId/establishmentId` | Condicional por rol | Consistencia de alcance | Usuarios > Crear/Editar | `POST/PUT /admin/users` | API: permisos y scope |
| `includeInactive` | No | Boolean | Usuarios > Listado | `GET /admin/users` | API: activos/inactivos |

## Plancheta (P2)
| Campo | Obligatorio | Validacion | Pantalla | Endpoint | Test |
|---|---|---|---|---|---|
| `institutionId` | Si en UI | Entero positivo | Planchetas > Filtros | UI (catálogos) | UI: carga establecimientos |
| `establishmentId` | Si para consultar/exportar | Entero positivo | Planchetas > Filtros | `GET /planchetas` | API: 400 si no viene |
| `dependencyId` | No | Entero positivo | Planchetas > Filtros | `GET /planchetas` | API: filtra por dependencia |
| `includeHistory` | No (default true) | Boolean | Planchetas > Filtros | `GET /planchetas` | Preview muestra historial |
| `responsibleName` | No (default) | String | Planchetas > Filtros | `GET /planchetas/pdf|excel` | Export incluye firma |
| `chiefName` | No (default) | String | Planchetas > Filtros | `GET /planchetas/pdf|excel` | Export incluye firma |
| `ministryText` | No (default) | String | Planchetas > Filtros | `GET /planchetas/pdf|excel` | Export incluye glosa |

---

## Definicion de terminado (DoD)
| Item | Criterio |
|---|---|
| Contrato | Campo y validacion documentados en esta matriz |
| Backend | Endpoint responde con `error/code/details` consistente |
| Frontend | Validacion previa + manejo de errores por `code` |
| Test API | Caso OK + al menos 2 casos de error por modulo |
| Test Manual | Checklist `PASS/FAIL` ejecutado |
| Trazabilidad | Commit limpio con mensaje de alcance |
