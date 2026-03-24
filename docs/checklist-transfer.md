# Checklist de transferencia de activos

Fecha: `____-__-__`  
Responsable: `______________`  
Version/commit: `______________`  
Ambiente: `local / staging / prod`

## Precondiciones
- [ ] Usuario `ADMIN_CENTRAL` disponible.
- [ ] Existe al menos 1 activo activo (no BAJA).
- [ ] Existe establecimiento destino (misma institucion) con sectores activos.
- [ ] Archivo de evidencia valido listo (`.pdf` / `.jpg` / `.png`).

## Caso OK (flujo feliz)
- [ ] Abrir `Assets` y elegir un activo activo.
- [ ] Click `Transferir`.
- [ ] Seleccionar establecimiento destino distinto al actual.
- [ ] Seleccionar sector destino.
- [ ] Seleccionar motivo de transferencia.
- [ ] Seleccionar tipo de documento.
- [ ] Adjuntar archivo de evidencia valido.
- [ ] Click `Confirmar transferencia`.
- [ ] Se muestra mensaje de exito.
- [ ] El activo queda en nuevo establecimiento/sector.
- [ ] Historial muestra movimiento `TRANSFER` con `reasonCode`.
- [ ] Evidencias muestra archivo asociado al `movementId` de la transferencia.

## Errores esperados (validacion UI)
- [ ] Sin establecimiento destino => bloquea con mensaje.
- [ ] Sin sector destino => bloquea con mensaje.
- [ ] Sin motivo => bloquea con mensaje.
- [ ] Sin archivo => bloquea con mensaje.

## Errores esperados (backend)
- [ ] Mismo destino actual => respuesta `409` (`ASSET_TRANSFER_SAME_DESTINATION`).
- [ ] Establecimiento/sector inactivos o invalidos => `400`.
- [ ] Transferencia a otra institucion => `400`.
- [ ] Archivo no permitido (`.exe`, etc.) => `400` (`INVALID_EVIDENCE_MIME_TYPE`).
- [ ] Usuario no `ADMIN_CENTRAL` => `403`.

## Resultado final
- [ ] **PASS** (todo correcto)
- [ ] **FAIL** (hay incidentes)

Incidencias detectadas:
- `1) __________________________`
- `2) __________________________`
- `3) __________________________`
