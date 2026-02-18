# Deploy Produccion: Frontend en Vercel + PostgreSQL en Supabase

## 1) Supabase (Base de Datos)
- Crea proyecto en Supabase.
- En `Project Settings -> Database`, copia:
  - `Connection string` (directa, puerto 5432)
  - `Connection pooling` (session pooler, recomendado para backend persistente)

Variables sugeridas en API:
- `DATABASE_URL=postgresql://...:5432/postgres?sslmode=require`
- `DIRECT_DATABASE_URL=postgresql://...:5432/postgres?sslmode=require`

## 2) Backend (Render/Railway)
Variables minimas:
- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET=<secreto_largo>`
- `CORS_ORIGIN=https://<tu-frontend>.vercel.app`
- `DATABASE_URL=<url_supabase>`
- `DIRECT_DATABASE_URL=<url_supabase>`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`
- `COOKIE_DOMAIN` (opcional)

Despues de guardar variables:
1. `npm run prisma:deploy`
2. `npm run prisma:generate`
3. `npm start`

Checks:
- `/health`
- `/ready`
- `/api/health`

## 3) Frontend (Vercel)
Root directory: `frontend`

Variables en Vercel:
- `VITE_API_BASE=https://<tu-api-publica>`

Build config:
- Build command: `npm run build`
- Output directory: `dist`

## 4) Validacion final
1. Login desde frontend.
2. Verifica que `POST /auth/refresh` (o `/api/auth/refresh`) responda 200.
3. Si falla refresh con 401 por cookie ausente:
   - confirma `COOKIE_SAMESITE=none`
   - confirma `COOKIE_SECURE=true`
   - confirma `CORS_ORIGIN` exacto al dominio Vercel.
