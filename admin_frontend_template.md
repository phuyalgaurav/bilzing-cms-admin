# Canonical tenant admin frontend specification

Build and maintain exactly one admin-frontend repository. Tenant provisioning never generates or forks application source code. It creates a configured deployment of this repository for one tenant.

## Required stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Accessible component primitives
- JWT authentication against the Django API
- Runtime tenant branding loaded from Django

The application must not contain tenant names, domains, colors, logos, API URLs, or tenant keys in source code.

## Deployment inputs

Every deployment receives these variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TENANT_KEY` | Immutable tenant identifier sent as `X-Tenant-Key`. |
| `NEXT_PUBLIC_API_URL` | Base URL of the shared Django backend. |
| `NEXT_PUBLIC_ADMIN_THEME` | JSON fallback containing the theme captured when the deployment was created. |

On application startup, fetch the current configuration from:

```http
GET {NEXT_PUBLIC_API_URL}/api/v1/tenant-config/
X-Tenant-Key: {NEXT_PUBLIC_TENANT_KEY}
```

The response is public branding metadata, not credentials:

```json
{
  "tenant_key": "acme",
  "name": "Acme Corporation",
  "admin_theme": {
    "brand_name": "Acme Content Studio",
    "logo_url": "https://cdn.example.com/acme/logo.svg",
    "favicon_url": "https://cdn.example.com/acme/favicon.ico",
    "primary_color": "#2563eb",
    "secondary_color": "#0f172a",
    "accent_color": "#f59e0b",
    "background_color": "#f8fafc",
    "surface_color": "#ffffff",
    "text_color": "#0f172a",
    "muted_text_color": "#64748b",
    "font_family": "Inter",
    "heading_font_family": "Inter",
    "border_radius": "0.75rem",
    "sidebar_position": "left",
    "sidebar_style": "solid",
    "login_background_url": "https://cdn.example.com/acme/login.webp",
    "support_url": "https://support.example.com/acme"
  }
}
```

Treat the JSON object as extensible. Unknown keys must be ignored. Missing keys must fall back to the application’s neutral default theme. Convert validated color and layout values into CSS custom properties at the root layout; do not generate tenant-specific Tailwind builds.

The Django Admin editor is prefilled with every supported key. New tenants use
the neutral values below, and the migration adds missing keys to existing
tenants without overwriting their custom values:

```json
{
  "brand_name": "Content Studio",
  "logo_url": "",
  "favicon_url": "",
  "primary_color": "#2563eb",
  "secondary_color": "#0f172a",
  "accent_color": "#f59e0b",
  "background_color": "#f5f6f8",
  "surface_color": "#ffffff",
  "text_color": "#171717",
  "muted_text_color": "#737373",
  "font_family": "Geist",
  "heading_font_family": "Geist",
  "border_radius": "0.75rem",
  "sidebar_position": "left",
  "sidebar_style": "solid",
  "login_background_url": "",
  "support_url": ""
}
```

| Key | What it changes |
| --- | --- |
| `brand_name` | Product name shown on login, in the sidebar, and in the browser title. |
| `logo_url` | Login and sidebar logo; empty uses the built-in icon/initial. |
| `favicon_url` | Browser-tab icon; empty uses the bundled favicon. |
| `primary_color` | Buttons, active navigation, links, and focus rings. |
| `secondary_color` | Secondary brand surface and account avatar. |
| `accent_color` | Accent surfaces and highlights. |
| `background_color` | Application page background. |
| `surface_color` | Cards, header, dialogs, and solid sidebar. |
| `text_color` | Main text color. |
| `muted_text_color` | Supporting labels and descriptions. |
| `font_family` | Body font name; the font must be available to the browser. |
| `heading_font_family` | Heading font name; the font must be available to the browser. |
| `border_radius` | Corner radius using `px`, `rem`, or `em`. |
| `sidebar_position` | `left` or `right` on desktop. |
| `sidebar_style` | `solid` card surface or `soft` muted surface. |
| `login_background_url` | Optional login and invitation background image. |
| `support_url` | Optional support link; hidden when empty. |

## Authentication contract

Login:

```http
POST /api/v1/auth/token/
Content-Type: application/json
X-Tenant-Key: {tenant key}

{"email":"admin@example.com","password":"..."}
```

Store the short-lived access token in memory. Keep the refresh token in the most secure storage supported by the final frontend architecture. Every authenticated API request must include:

```http
Authorization: Bearer {access token}
X-Tenant-Key: {tenant key}
```

Support these authentication routes:

- `/login`
- `/invite?token=...` using `POST /api/v1/auth/invitations/accept/`
- automatic access-token refresh using `POST /api/v1/auth/token/refresh/`
- logout that clears all local authentication state

Never allow a tenant key from a JWT, URL, browser storage, or API response to replace the deployment’s `NEXT_PUBLIC_TENANT_KEY`.

## Admin features

Implement these tenant-scoped sections:

- Dashboard
- Pages
- Posts
- Navigation
- Media
- Tenant members and roles when the backend endpoint becomes available
- Profile and session controls

Use the API operations and role requirements in [api_endpoints.md](./api_endpoints.md). Hide controls the current JWT role cannot use, while still treating backend `403` responses as authoritative.

Editors must be able to work with structured JSON content without editing raw application code. Pages and posts need draft/published state, preview affordances, validation errors, loading states, empty states, and destructive-action confirmation.

## Repository structure

```text
admin-frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── invite/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── pages/
│       ├── posts/
│       ├── navigation/
│       └── media/
├── components/
│   ├── admin-shell/
│   ├── content-editor/
│   └── ui/
├── lib/
│   ├── api-client.ts
│   ├── auth.ts
│   ├── tenant-config.ts
│   └── theme.ts
├── public/
├── package.json
└── package-lock.json
```

`npm run dev -- --hostname 0.0.0.0 --port <port>` must start the development server. A committed `package-lock.json` is required so local tenant provisioning can use `npm ci` reproducibly.

## Local deployment behavior

The backend mounts this canonical repository read-only. When a tenant is created with **Provision admin frontend** enabled, Celery:

1. Copies the source into `.admin-deployments/<tenant-key>/` without `.git`, `.next`, `node_modules`, or existing local environment files.
2. Writes `.env.local` and `tenant-admin-config.json` for that tenant.
3. Runs `npm ci`.
4. Starts a dedicated development process on an available port from 3000 through 3099.
5. Stores the resulting local URL on `TenantSite.admin_frontend_url`.

These workspaces are disposable build artifacts. Developers only edit the canonical repository.

## Production deployment behavior

Production provisioning creates or reuses a Vercel project named `<VERCEL_PROJECT_PREFIX>-<tenant-key>`, using the configured `ADMIN_PANEL_REPOSITORY` GitHub repository ID and its `main` branch. It injects the same three public variables and creates a production deployment. Each tenant therefore receives an isolated Vercel project and URL while all projects share one source repository.

## Acceptance criteria

- One source repository supports every tenant.
- No tenant-specific source branch or Git repository is created.
- A deployment cannot access another tenant by changing browser state or URL parameters.
- Branding changes in Django are reflected after the runtime configuration is refetched.
- The interface remains usable when optional theme properties are absent.
- All pages have loading, error, empty, and permission-denied states.
- Keyboard navigation, visible focus, semantic labels, reduced motion, and mobile layouts are supported.
- `npm run build`, type checking, linting, and frontend tests pass before the canonical repository is connected to automatic provisioning.
