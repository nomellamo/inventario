# Monitoring Metrics Endpoint

Endpoint basico para paneles y alertas operativas.

## Route
- `GET /metrics`
- `GET /metrics/prometheus`

## Response (200)
- `ok`: `true`
- `requestId`: id de la solicitud
- `time`: timestamp ISO
- `service`: nombre, version, runtime y uptime
- `memory`: uso de memoria en MB
- `db`: estado de DB y latencia de `SELECT 1`

## Response (503)
- `ok`: `false`
- `code`: `METRICS_DB_TIMEOUT` o `METRICS_DB_DOWN`
- Incluye igual `service`, `memory` y `db` para diagnostico.

## Prometheus format
- `GET /metrics/prometheus` devuelve `text/plain; version=0.0.4`.
- Metricas incluidas:
1. `inventario_uptime_seconds`
2. `inventario_process_resident_memory_bytes`
3. `inventario_process_heap_used_bytes`
4. `inventario_process_heap_total_bytes`
5. `inventario_process_external_bytes`
6. `inventario_db_up`
7. `inventario_db_latency_ms`
8. `inventario_build_info{service,version,node,env} 1`

## Suggested alerts
1. `status != 200` por 2-3 minutos consecutivos.
2. `db.ok == false`.
3. `db.latencyMs > 1000` sostenido.
4. `memory.heapUsedMb` con tendencia de crecimiento continuo.
