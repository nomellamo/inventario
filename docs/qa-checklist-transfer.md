# QA Checklist - Transfer de Asset (Pass/Fail)

Fecha: `____-__-__`  
Tester: `______________`  
Versión/commit: `______________`  
Ambiente: `local / staging / prod`

## Precondiciones
- [ ] Usuario `ADMIN_CENTRAL` disponible.
- [ ] Existe al menos 1 asset activo (no BAJA).
- [ ] Existe establecimiento destino (misma institución) con dependencias activas.
- [ ] Archivo de evidencia válido listo (`.pdf` / `.jpg` / `.png`).

## Caso OK (flujo feliz)
- [ ] Abrir `Assets` y elegir un asset activo.
- [ ] Click `Transferir`.
- [ ] Seleccionar establecimiento destino distinto al actual.
- [ ] Seleccionar dependencia destino.
- [ ] Seleccionar motivo de transferencia.
- [ ] Seleccionar tipo de documento.
- [ ] Adjuntar archivo de evidencia válido.
- [ ] Click `Confirmar transferencia`.
- [ ] Se muestra mensaje de éxito.
- [ ] El asset queda en nuevo establecimiento/dependencia.
- [ ] Historial muestra movimiento `TRANSFER` con `reasonCode`.
- [ ] Evidencias muestra archivo asociado al `movementId` de la transferencia.

## Errores esperados (validación UI)
- [ ] Sin establecimiento destino => bloquea con mensaje.
- [ ] Sin dependencia destino => bloquea con mensaje.
- [ ] Sin motivo => bloquea con mensaje.
- [ ] Sin archivo => bloquea con mensaje.

## Errores esperados (backend)
- [ ] Mismo destino actual => respuesta `409` (`ASSET_TRANSFER_SAME_DESTINATION`).
- [ ] Establecimiento/dependencia inactivos o inválidos => `400`.
- [ ] Transferencia a otra institución => `400`.
- [ ] Archivo no permitido (`.exe`, etc.) => `400` (`INVALID_EVIDENCE_MIME_TYPE`).
- [ ] Usuario no `ADMIN_CENTRAL` => `403`.

## Resultado final
- [ ] **PASS** (todo correcto)
- [ ] **FAIL** (hay incidentes)

Incidencias detectadas:
- `1) __________________________`
- `2) __________________________`
- `3) __________________________`

