# Bilzing CMS Admin

Canonical tenant admin frontend for Bilzing CMS. The same Next.js application is deployed for every tenant and receives branding and API configuration at runtime.

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Required environment variables:

- `NEXT_PUBLIC_TENANT_KEY` — immutable tenant identifier
- `NEXT_PUBLIC_API_URL` — shared Django API base URL
- `NEXT_PUBLIC_ADMIN_THEME` — optional JSON theme fallback
- `NEXT_PUBLIC_DEMO_MODE` — set to `true` for the local sample workspace, or `false` for the Django API

Demo login: `admin@bilzing.test` / `demo1234`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

The project uses the Next.js App Router, Tailwind CSS, Radix UI primitives, and shadcn-style local UI components. It is ready to deploy on Vercel.
