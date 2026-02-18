# Roadmap Gobierno 30/60/90 - Sistema de Inventario

## Objetivo
Dejar el sistema listo para operacion institucional con trazabilidad, auditoria, control de acceso y cumplimiento.

## Estado actual (2026-02-11)
- [x] `reasonCode` obligatorio en `TRANSFER`, `STATUS_CHANGE`, `RESTORE`.
- [x] Evidencia obligatoria en movimientos sensibles (transferencia, baja, restauracion).
- [x] UI operativa para transferencia con destino + motivo + evidencia.
- [x] Auditoria y errores estables por `code` en conflictos clave.
- [x] Importador de catalogo con deduplicacion y reporte (`created/skipped/errors`).
- [x] Contrato funcional y matriz ejecutable documentados (`docs/functional-contract.md`, `docs/executable-matrix.md`).
- [ ] Plancheta ministerial implementada, pendiente validacion funcional con datos reales (base actualmente limpia).

## Fase 1 (0-30 dias) - Minimo Operable y Control
### 1) Trazabilidad y evidencia
- [x] Adjuntar evidencia por activo (foto, factura, acta, resolucion).
- [x] Campo `motivo` obligatorio para BAJA, RESTORE y TRANSFER.
- [ ] Export auditoria completa en CSV/XLSX/PDF por rango de fechas.

### 2) Seguridad y control de acceso
- [ ] Forzar politica de contrasenas (minimo, complejidad, expiracion opcional).
- [ ] Bloqueo por intentos fallidos + alertas de login anomalo.
- [ ] Sesiones y refresh token con revocacion total por usuario.

### 3) Calidad de datos de inventario
- [ ] Validacion de duplicados por serie + marca + modelo.
- [ ] Catalogo maestro con campos obligatorios por tipo de bien.
- [ ] Reglas de consistencia para importacion masiva (plantillas versionadas).

### 4) Operacion y estabilidad
- [ ] Backups diarios y prueba de restauracion.
- [ ] Monitoreo de errores 5xx y alertas basicas.
- [ ] CI obligatorio en PR con `npm test`.

## Fase 2 (31-60 dias) - Cumplimiento y Gobierno de Datos
### 1) Flujos de aprobacion
- [ ] Doble aprobacion para BAJA y transferencias sensibles.
- [ ] Estado de solicitud (PENDIENTE, APROBADA, RECHAZADA).
- [ ] Registro de aprobador y comentario obligatorio.

### 2) Integracion institucional
- [ ] Vinculacion con correo institucional.
- [ ] SSO (Azure AD / Google Workspace / LDAP segun organismo).
- [ ] Notificaciones automaticas por correo (alta, baja, transferencia, vencimientos).

### 3) Reporteria de control
- [ ] Dashboard ejecutivo por establecimiento.
- [ ] KPIs: activos sin responsable, sin ubicacion, sin evidencia, en baja.
- [ ] Reporte de cumplimiento para auditoria interna/externa.

## Fase 3 (61-90 dias) - Escala y Fiscalizacion
### 1) Inventario fisico avanzado
- [ ] Etiquetas QR por activo.
- [ ] Escaneo movil (modo offline + sincronizacion).
- [ ] Conciliacion inventario teorico vs fisico con actas.

### 2) Integraciones financieras y compras
- [ ] Integracion con ERP/finanzas (centro de costo, activo fijo).
- [ ] Cruce con ordenes de compra/facturas.
- [ ] Reglas de depreciacion y vida util por categoria.

### 3) Continuidad y madurez
- [ ] Ambientes separados (dev/qa/prod) con despliegue controlado.
- [ ] Pruebas de carga sobre importaciones masivas.
- [ ] Simulacro de contingencia y recuperacion.

## Prioridad inmediata (proximo sprint)
1. Cargar estructura base real por UI (establecimientos, dependencias, activos) y validar plancheta ministerial end-to-end.
2. Cerrar regla de duplicados de inventario por serie/marca/modelo en alta/importacion.
3. Endurecer seguridad de cuentas (politica de password + bloqueo por intentos).
4. Dashboard minimo de cumplimiento (sin responsable/sin ubicacion/sin evidencia/sin historial).
