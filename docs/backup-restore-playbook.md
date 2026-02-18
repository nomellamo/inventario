# Backup y Restore Playbook (Produccion)

## Objetivo
Tener respaldo confiable y recuperacion comprobada de la base de datos ante:
- borrado accidental,
- corrupcion de datos,
- fallo de migracion,
- incidente de infraestructura.

Este documento define politica, comandos y prueba operativa mensual.

---

## 1. Politica recomendada
- Backup logico diario: 1 vez cada 24h.
- Backup previo a despliegue: obligatorio antes de `migrate deploy`.
- Retencion:
  - diarios: 14 dias,
  - semanales: 8 semanas,
  - mensuales: 12 meses.
- Encriptacion en repositorio de backups.
- Restore drill (simulacro) al menos 1 vez por mes.

---

## 2. Requisitos tecnicos
- `DATABASE_URL` configurado.
- Cliente PostgreSQL instalado:
  - `pg_dump`
  - `pg_restore`
  - `psql`

Verificar:
```bash
pg_dump --version
pg_restore --version
psql --version
```

---

## 3. Scripts del proyecto
Comandos agregados al repo:
- `npm run db:backup`
- `npm run db:restore -- --file <ruta>`

Opciones:
- `npm run db:backup -- --out backups/mi_respaldo.dump`
- `npm run db:restore -- --file backups/mi_respaldo.dump --clean`

Notas:
- `--clean` elimina objetos existentes antes de restaurar.
- Para restaurar SQL plano:
  - `npm run db:restore -- --file backups/mi_respaldo.sql`

---

## 4. Flujo operativo diario (backup)
1. Confirmar conectividad DB.
2. Ejecutar:
```bash
npm run db:backup
```
3. Confirmar archivo generado en `backups/`.
4. Copiar respaldo a almacenamiento externo (bucket/cloud seguro).
5. Registrar ejecucion (fecha, hash, operador).

---

## 5. Flujo previo a despliegue (obligatorio)
1. Ejecutar backup:
```bash
npm run db:backup
```
2. Ejecutar release check:
```bash
npm run release:check
```
3. Si `release:check` falla:
- no desplegar,
- corregir,
- repetir.

---

## 6. Restore drill mensual (prueba de recuperacion)
Objetivo: comprobar que el respaldo realmente sirve.

## 6.1 Preparacion
1. Crear base temporal de prueba (`inventario_restore_test`).
2. Apuntar `DATABASE_URL` a la base temporal.
3. Seleccionar backup reciente.

## 6.2 Restauracion
```bash
npm run db:restore -- --file backups/<archivo>.dump --clean
```

## 6.3 Validacion minima
1. Levantar API contra base restaurada.
2. Verificar:
- `/health` responde OK.
- login admin funciona.
- listado catalogos funciona.
- al menos una consulta de activos funciona.
3. Ejecutar:
```bash
npm run test:smoke-admin
```

## 6.4 Cierre
1. Documentar resultado del simulacro:
- fecha,
- backup usado,
- tiempo de recuperacion,
- hallazgos.
2. Si falla, abrir incidente y corregir playbook.

---

## 7. Supabase (PostgreSQL) - recomendaciones
- Mantener backups nativos del proveedor activos.
- Complementar con backup logico del proyecto (defensa en profundidad).
- Probar restore en entorno separado (staging o DB temporal).
- Rotar claves de acceso y restringir IP si aplica.

---

## 8. Riesgos comunes y mitigacion
- Riesgo: backup existe pero no restaura.
  - Mitigacion: restore drill mensual obligatorio.
- Riesgo: sobrescribir produccion por error.
  - Mitigacion: restaurar primero en DB temporal.
- Riesgo: secretos expuestos.
  - Mitigacion: variables de entorno seguras + rotacion.
- Riesgo: migracion rompe esquema.
  - Mitigacion: backup previo + `release:check`.

---

## 9. Checklist de cierre de incidente DB
- [ ] Backup confirmado y accesible.
- [ ] Restore probado en entorno seguro.
- [ ] Servicio operativo.
- [ ] Integridad funcional validada (smoke + flujo critico).
- [ ] Causa raiz documentada.

