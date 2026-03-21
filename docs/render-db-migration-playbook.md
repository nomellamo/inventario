# Render DB Migration Playbook

## Objetivo
Mover datos desde la base vieja de Render a la nueva `inventario-db-free-2` sin perder esquema, secuencias ni historial de migraciones.

## Antes de empezar
- Pausa escrituras en la aplicacion mientras haces el corte.
- Ten a mano la URL de la DB origen y la URL de la DB destino.
- Verifica que tengas `pg_dump`, `pg_restore` y `psql` instalados.
- Haz el cambio en una ventana de mantenimiento.

## Regla operativa
- `npm run db:backup` siempre debe apuntar a la DB origen.
- `npm run db:restore` siempre debe apuntar a la DB destino.
- No uses el mismo `.env` para origen y destino al mismo tiempo.
- Si quieres evitar editar `.env`, usa `BACKUP_DATABASE_URL` y `RESTORE_DATABASE_URL`.
- Para `npx prisma migrate deploy`, usa `PRISMA_MIGRATE_DATABASE_URL` si necesitas apuntar a una DB distinta.

## 1) Crear respaldo de la DB vieja
1. Configura temporalmente `BACKUP_DATABASE_URL` con la DB vieja, o usa `--database-url`.
2. Ejecuta:

```powershell
npm run db:backup -- --database-url <url_origen> --out backups/inventario_before_render_cutover.dump
```

3. Confirma que el archivo exista y no pese cero.

## 2) Preparar la DB nueva
1. Cambia el `.env` local o las variables del backend en Render para apuntar a la DB nueva.
2. Si el backend corre en Render, actualiza `DATABASE_URL` y `DIRECT_DATABASE_URL` con la nueva conexion.
3. Si prefieres no tocar `.env`, usa `RESTORE_DATABASE_URL` para el destino y `BACKUP_DATABASE_URL` para el origen.
4. Si la DB destino quedo con restos de un intento anterior, usa `--reset-schema`.

## 3) Restaurar en la DB nueva

```powershell
npm run db:restore -- --database-url <url_destino> --file backups/inventario_before_render_cutover.dump --reset-schema
```

## 4) Verificar que quedo bien

```powershell
npm run db:check -- --database-url <url_destino>
npm run prisma:deploy
npm run prisma:generate
npm run test:smoke-admin
```

Si el smoke test usa credenciales especiales, asegura que `TEST_CENTRAL_EMAIL` y `TEST_CENTRAL_PASSWORD` esten cargados.

## 5) Corte final en Render
1. Confirma que el backend apunte a la DB nueva.
2. Redeploy del backend.
3. Prueba login, listado de activos, importacion y restore.
4. Deja la DB vieja congelada como fallback hasta validar todo.

## 6) Rollback
Si algo falla:
1. Vuelve a apuntar el backend a la DB vieja.
2. Redeploy.
3. Corrige el problema y repite la restauracion.

## Checklist de cierre
- [ ] Backup de la DB vieja creado.
- [ ] Restore en la DB nueva completado.
- [ ] `npm run db:check` OK.
- [ ] `npm run prisma:deploy` OK.
- [ ] Smoke test OK.
- [ ] Backend apuntando a la DB nueva.
