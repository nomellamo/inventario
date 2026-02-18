# Release Checklist

## Objective
Ensure each change is deployed with migrations, regenerated Prisma client, and critical tests passing.

## One-command verification
Run:

```bash
npm run release:full
```

This executes:
1. `npm run db:backup`
2. `npm run release:check`
3. `npm run test:smoke-admin`

`npm run release:check` executes:
1. `npm run prisma:deploy`
2. `npm run prisma:generate`
3. `npm test`

Detailed procedure:
- `docs/backup-restore-playbook.md`

## Minimum manual checks before production
1. Catalog import:
- Import file with `officialKey`.
- Verify `created/skipped/errors` and CSV downloads.

2. Catalog admin UI:
- Edit item inline.
- Test duplicate `officialKey` validation.
- Use `Descartar` and confirm row reset.

3. Assets critical flow:
- Create asset.
- Transfer with reason.
- BAJA with reason.
- Restore with reason.
- Evidence upload/list/download.

## If release check fails
1. Do not deploy.
2. Fix failing migration/test.
3. Re-run `npm run release:full`.
4. Only deploy when all steps pass.
