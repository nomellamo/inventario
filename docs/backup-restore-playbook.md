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
- `DIRECT_DATABASE_URL` o `DATABASE_URL` configurado.
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
- `npm run db:check`

Si vas a migrar de una base vieja de Render a una nueva, sigue tambien:
- `docs/render-db-migration-playbook.md`

Opciones:
- `npm run db:backup -- --out backups/mi_respaldo.dump`
- `npm run db:backup -- --database-url <url_origen> --out backups/mi_respaldo.dump`
- `npm run db:restore -- --file backups/mi_respaldo.dump --clean`
- `npm run db:restore -- --database-url <url_destino> --file backups/mi_respaldo.dump --clean`
- `npm run db:restore -- --database-url <url_destino> --file backups/mi_respaldo.dump --reset-schema`
- `npm run db:restore-latest -- --reset-schema`
- `npm run db:check -- --database-url <url>`

Notas:
- `--clean` elimina objetos existentes antes de restaurar.
- Para restaurar SQL plano:
  - `npm run db:restore -- --file backups/mi_respaldo.sql`

---

## 4. Flujo antes de deploy
1. Ejecutar:
```bash
npm run release:full
```
Este comando hace backup primero y luego corre validaciones criticas antes de mover a produccion.
2. Si vas a publicar un cambio grande, tambien puedes disparar manualmente `DB Backup` en GitHub Actions para guardar un artifact descargable adicional.

---

## 5. Flujo operativo diario (backup)
1. Confirmar conectividad DB.
2. Ejecutar:
```bash
npm run db:backup
```
3. Confirmar archivo generado en `backups/`.
4. Copiar respaldo a almacenamiento externo (bucket/cloud seguro).
5. Registrar ejecucion (fecha, hash, operador).

---

## 6. Restore drill mensual (prueba de recuperacion)
Objetivo: comprobar que el respaldo realmente sirve.

## 6.1 Preparacion
1. Crear base temporal de prueba (`inventario_restore_test`).
2. Apuntar `DIRECT_DATABASE_URL` o `DATABASE_URL` a la base temporal.
3. Seleccionar backup reciente.

## 6.2 Restauracion
```bash
npm run db:restore -- --file backups/<archivo>.dump --reset-schema
```
Si solo quieres levantar el ultimo respaldo disponible:
```bash
npm run db:restore-latest -- --reset-schema
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
npm run db:check -- --database-url <url_restaurada>
```
4. Ejecutar:
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

## 7. PostgreSQL - recomendaciones
- Mantener backups nativos del proveedor activos.
- Complementar con backup logico del proyecto (defensa en profundidad).
- Probar restore en entorno separado (staging o DB temporal).
- Rotar claves de acceso y restringir IP si aplica.

## 7.1 Render
- Para este repo, usa la misma conexion en `DATABASE_URL` y `DIRECT_DATABASE_URL` si no necesitas separar runtime y migraciones.
- Antes de borrar una instancia vieja, valida primero el restore en la nueva.
- Si el backup desde tu PC corta SSL, ejecuta el backup con la URL externa correcta o desde un servicio/one-off job dentro de Render.
- Si `pg_restore` dice que objetos ya existen, vuelve a correr con `--reset-schema`.

---

## 7. Backup automatizado
Hay un flujo automatico en GitHub Actions para generar un respaldo descargable sin hacerlo a mano:

- Archivo: `.github/workflows/db-backup.yml`
- Disparadores:
  - diario a las `03:00 UTC`,
  - ejecucion manual con `workflow_dispatch`.
- Nombre del archivo:
  - `inventario_backup_YYYY-MM-DD_HH-MM-SS.dump` por defecto,
  - `<prefijo>_YYYY-MM-DD_HH-MM-SS.dump` si pasas un prefijo manual.
- Requisito:
  - crear el secret `BACKUP_DATABASE_URL` en GitHub con la URL externa de la DB que quieras resguardar.
- Salida:
  - un artifact `inventario-db-backup-<nombre>` con un archivo `.dump`.
- Retencion:
  - 30 dias por defecto.

Restauracion desde ese artifact:
1. Descargar el `.dump` desde GitHub Actions.
2. Ejecutar:
```bash
npm run db:restore -- --file backups/<archivo>.dump --reset-schema
```
3. Validar con:
```bash
npm run db:check -- --database-url <url_destino>
```

Nota:
- Si quieres retencion mas larga que la de GitHub Actions, copia ese `.dump` a tu almacenamiento externo preferido apenas se genere.

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
