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

## Analytics dashboard

The Analytics page reads the authenticated tenant-scoped summary endpoint and
shows current-versus-previous traffic, visitor quality, acquisition, devices,
campaigns, landing pages, conversions, value, journey stages, and operational
record activity for every enabled CMS module. Periods are 7, 30, 90, 180, and
365 days.

The dashboard does not collect browser events itself. Consumer sites discover
and write `analytics/events`; this admin only reads aggregated reports. Empty
traffic is therefore an integration signal, not a reason to fabricate chart
data. Use the backend `docs/analytics.md` checklist to verify capability,
consumer proxy acceptance, stored events, aggregation, and live rendering.

The chart components use responsive containers and separate traffic and
conversion scales. When the backend response changes, update
`lib/analytics-api.ts`, demo data, the dedicated Analytics page, and the compact
dashboard view together.

## Runtime branding

`NEXT_PUBLIC_ADMIN_THEME` is a deployment fallback only. The live
`/api/v1/tenant-config/` response is authoritative after startup, and the app
refreshes it on focus, visibility changes, and a short interval. Logo, colors,
fonts, density, layout, and favicon updates therefore do not require a new
deployment. Favicon URLs include a theme revision query so browsers do not keep
showing a previously cached tenant icon.

Existing generated tenant admins must still be redeployed when this template's
code changes. A source push updates the template repository; it does not rebuild
every existing Vercel tenant project.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

The full platform documentation is maintained in the
[Bilzing CMS backend repository](https://github.com/phuyalgaurav/bilzing-cms-backend/tree/main/docs).
