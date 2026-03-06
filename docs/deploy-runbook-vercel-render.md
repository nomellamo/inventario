# Runbook de Despliegue (Vercel + Render)

Este documento resume el flujo estable para desplegar el sistema y resolver los errores mas comunes (CORS, 401, Prisma, DNS).

## 1) Arquitectura recomendada

- Frontend: Vercel
- Backend API: Render (Web Service)
- Base de datos: Render Postgres (o Supabase, si migras)

## 2) Variables de entorno por plataforma

### 2.1 Frontend (Vercel)

Configura solo variables `VITE_*`.

```env
VITE_API_BASE=https://inventario-lxtk.onrender.com
```

No poner en Vercel frontend:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `SMTP_*`

### 2.2 Backend (Render)

Minimo requerido:

```env
NODE_ENV=production
JWT_SECRET=REEMPLAZAR_SECRET_LARGO
CORS_ORIGIN=https://inventario-alpha-one.vercel.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB
```

Notas:

- En Render no usar `localhost` en DB.
- En Render no definir `PORT` manualmente.
- Si cambias URL de Vercel (`*.vercel.app`), debes actualizar `CORS_ORIGIN`.

## 3) Flujo mecanico de despliegue

1. Actualiza variables en Render (backend).
2. Ejecuta `Manual Deploy` del backend.
3. Revisa logs:
   - Debe correr `prisma migrate deploy` sin error.
   - Debe iniciar servidor y responder health/root.
4. Despliega frontend:

```powershell
vercel --prod
```

5. Copia la URL nueva de Vercel.
6. Si esa URL no esta en `CORS_ORIGIN`, agrégala en Render y redeploy backend.
7. Prueba login en frontend.

## 4) Validacion post-deploy

En DevTools > Network:

1. `POST /auth/login` debe responder 200.
2. Debe existir `Set-Cookie` de `refresh_token`.
3. `POST /auth/refresh` debe funcionar despues de login.

Si `refresh` da `REFRESH_TOKEN_REQUIRED`, normalmente login falló antes o no se guardó cookie.

## 5) Seed y usuarios iniciales

Comando:

```powershell
node prisma/seed.js
```

Usuarios seed:

- `admin@cordillera.local` / `admin123`
- `a.nunezu.n@gmail.com` / `123456789`

Importante sobre seed:

- Si `DATABASE_URL` usa host interno Render (`dpg-...` sin dominio), solo funciona dentro de Render.
- Desde tu PC, usa URL externa (`...oregon-postgres.render.com`) con SSL.

## 6) Errores frecuentes y solucion

### 6.1 `P1001 Can't reach database server at localhost:5432`

Causa: DB en Render apuntando a `localhost`.

Solucion: usar `DATABASE_URL`/`DIRECT_DATABASE_URL` de Render DB.

### 6.2 `The datasource.url property is required`

Causa: `DATABASE_URL` vacia/no definida en Render.

Solucion: definir `DATABASE_URL` correctamente y redeploy.

### 6.3 `P1017 Server has closed the connection`

Causa: URL externa DB mal formada o SSL faltante.

Solucion: usar URL externa completa con SSL, por ejemplo:

- `?sslmode=require` o
- `?sslmode=verify-full`

### 6.4 Error CORS en login

Causa: origin de frontend no incluido en `CORS_ORIGIN`.

Solucion: agregar URL exacta de Vercel y redeploy backend.

### 6.5 `401 Credenciales invalidas`

Causa: email/clave incorrectos o usuario no seed.

Solucion: ejecutar seed y usar credenciales seed.

## 7) Checklist rapido (modo robot)

1. Verificar vars backend (Render).
2. Deploy backend.
3. Verificar logs backend.
4. Deploy frontend (`vercel --prod`).
5. Actualizar `CORS_ORIGIN` si cambió URL Vercel.
6. Probar login.
7. Verificar cookie refresh.
8. Confirmar flujo funcional.

## 8) Migracion futura a dominio comprado

Objetivo final:

- `app.tudominio.cl` (frontend)
- `api.tudominio.cl` (backend)

Config final backend:

```env
CORS_ORIGIN=https://app.tudominio.cl
COOKIE_SAMESITE=none
COOKIE_SECURE=true
COOKIE_DOMAIN=.tudominio.cl
```

Config final frontend:

```env
VITE_API_BASE=https://api.tudominio.cl
```

DNS requerido:

- `app` CNAME a Vercel target
- `api` CNAME a Render target

## 9) Seguridad minima obligatoria

1. Rotar password de DB si fue expuesta.
2. Rotar `JWT_SECRET` si fue compartido.
3. No subir `.env` al repositorio.
4. Guardar secretos solo en Environment Variables de plataforma.
