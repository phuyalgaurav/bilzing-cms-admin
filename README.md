# Bilzing CMS Admin

The canonical Next.js tenant admin for Bilzing CMS. One codebase is configured
and deployed independently for every tenant; tenant names, modules, branding,
and API URLs are not hardcoded.

## Run connected to Django

```bash
cp .env.example .env.local
npm ci
npm run dev
```

```dotenv
NEXT_PUBLIC_TENANT_KEY=acme
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
CMS_API_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_MODE=false
```

When Next.js runs inside the backend Docker network, use
`CMS_API_INTERNAL_URL=http://web:8000` while keeping `NEXT_PUBLIC_API_URL` set to
the browser-reachable backend. Restart the dev process after changing env vars.

## Run standalone demo mode

```bash
npm ci
npm run dev:demo
```

Demo login: `admin@bilzing.test` / `demo1234`.

Demo mode enables every module and supports local CRUD, workflows, members,
record context, media, and maps using browser storage. It is for product testing
only and does not write Django data.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TENANT_KEY` | Immutable tenant identifier. |
| `NEXT_PUBLIC_API_URL` | Browser-facing shared Django API. |
| `CMS_API_INTERNAL_URL` | Optional server-only API URL for auth handlers. |
| `NEXT_PUBLIC_ADMIN_THEME` | JSON fallback theme. |
| `NEXT_PUBLIC_ENABLED_MODULES` | JSON module fallback. |
| `NEXT_PUBLIC_MODULE_PRESET` | Preset fallback. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` enables standalone demo mode. |

## Product structure

- Dashboard sections controlled centrally from the tenant’s Django Admin record.
- Runtime sidebar category/item ordering from `/api/v1/tenant-config/`; changing it does not require redeployment.
- Daily enabled modules in primary navigation.
- Website/configuration tools under Settings.
- Dedicated pages, posts, navigation, media, members, and profile screens.
- Contract-driven concrete resource editors for every optional module.
- Search, filters, workflow/lifecycle actions, related creation, media pickers,
  context tools, and map/directions support.

The authenticated backend response from `/api/v1/admin/modules/` controls
canonical endpoints, fields, workflows, and `allowed_actions`. The backend is
authoritative for RBAC.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

The full platform documentation is maintained in the
[Bilzing CMS backend repository](https://github.com/phuyalgaurav/bilzing-cms-backend/tree/main/docs).
