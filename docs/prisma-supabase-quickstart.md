# Prisma + Supabase Quickstart (sin errores P1013)

## 1) Copia la URL correcta desde Supabase
- En Supabase, usa `Connection string` con `Method: Session pooler` (o Transaction pooler).
- Evita `Direct connection` si tu entorno es IPv4-only.

## 2) Configura variables (backend)
Usa `.env.example` como base. Valores clave:
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

Formato valido:
`postgresql://postgres:PASSWORD_ENCODED@HOST:6543/postgres?sslmode=require&pgbouncer=true`

## 3) Reglas para evitar P1013
- No uses `<` ni `>` en la URL final.
- No dejes placeholders (`POOLER_HOST`, `YOUR_PASSWORD`) sin reemplazar.
- No incluyas espacios ni saltos de linea.
- Si la password tiene simbolos, usa URL-encoding.

PowerShell para encodear password:
`[System.Uri]::EscapeDataString("MiClave@2026#ok")`

## 4) Validacion
Ejecuta:
1. `npx prisma generate`
2. `npx prisma migrate deploy`

Si falla, revisa primero host/puerto/password encoded.

## 5) Produccion (frontend separado)
Si frontend vive en Vercel y API en otro dominio:
- `CORS_ORIGIN=https://tu-frontend.vercel.app`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`
