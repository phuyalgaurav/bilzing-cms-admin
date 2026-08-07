# API endpoint reference

Live OpenAPI documentation is available at `/swagger/` and `/redoc/`. Every tenant API request must resolve a tenant using `X-Tenant-Key`, the tenant's exact custom domain, or `<tenant-key>.<CMS_BASE_DOMAIN>`.

```http
X-Tenant-Key: acme
```

Unknown or inactive tenants receive `404`.

## Tenant admin frontend

The tenant's Next.js admin panel uses the following authentication and content-management endpoints.

Every tenant admin deployment is built from the one canonical repository described in [admin_frontend_template.md](./admin_frontend_template.md).

### Runtime tenant configuration

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/tenant-config/` | Public, tenant required | Returns the tenant name and current non-secret admin theme configuration. |

### Authentication

| Method | Endpoint | Authentication | Request body | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/token/` | Public, tenant required | `email`, `password` | Returns access and refresh JWTs containing `tenant_key` and `role`. |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh token | `refresh` | Returns a new access token. |
| `POST` | `/api/v1/auth/invitations/accept/` | Signed invitation | `token`, `password` | Accepts the initial admin invitation, creates the global login, and returns tenant JWTs. |

Access tokens expire after 15 minutes. Refresh tokens expire after seven days.

```bash
curl -X POST https://api.yourcms.com/api/v1/auth/token/ \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Key: acme' \
  -d '{"email":"editor@example.com","password":"your-password"}'
```

### Content management

| Resource | Collection endpoint | Detail endpoint |
| --- | --- | --- |
| Pages | `/api/v1/pages/` | `/api/v1/pages/{slug}/` |
| Posts | `/api/v1/posts/` | `/api/v1/posts/{slug}/` |
| Navigations | `/api/v1/navigations/` | `/api/v1/navigations/{slug}/` |
| Media | `/api/v1/media/` | `/api/v1/media/{id}/` |

All resources support this method pattern:

| Method | Operation | Minimum role |
| --- | --- | --- |
| `GET` collection | List/search content | Public; matching Viewer JWT can also see drafts |
| `GET` detail | Retrieve one item | Public; matching Viewer JWT can also see drafts |
| `POST` collection | Create content | Editor |
| `PUT` detail | Replace content | Editor |
| `PATCH` detail | Partially update content | Editor |
| `DELETE` detail | Delete content | Super Admin |

Roles are ordered `Viewer < Editor < Super Admin`. A JWT issued for one tenant cannot write to or reveal drafts from another tenant.

List endpoints accept:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `search` | `?search=about` | Searches configured text fields. |
| `ordering` | `?ordering=-updated_at` | Orders by `created_at` or `updated_at`. |

Page fields: `title`, `slug`, `status`, `published_at`, `excerpt`, `content`, and `seo`.

Post fields: `title`, `slug`, `status`, `published_at`, `excerpt`, `content`, `author_name`, `featured_image`, and `tags`.

Navigation fields: `name`, `slug`, and an `items` JSON array.

Media fields: `title`, multipart `file`, `alt_text`, and `metadata`. Production files are stored in Cloudflare R2 under `tenants/<tenant-key>/media/`.

```bash
curl -X POST https://api.yourcms.com/api/v1/pages/ \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Key: acme' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{"title":"About","slug":"about","status":"draft","content":{}}'
```

## Public website frontend

The public Next.js website uses read-only requests without a JWT.

| Method | Endpoint | Public behavior |
| --- | --- | --- |
| `GET` | `/api/v1/pages/` | Lists published pages only. |
| `GET` | `/api/v1/pages/{slug}/` | Retrieves a published page. |
| `GET` | `/api/v1/posts/` | Lists published posts only. |
| `GET` | `/api/v1/posts/{slug}/` | Retrieves a published post. |
| `GET` | `/api/v1/navigations/` | Lists tenant navigation structures. |
| `GET` | `/api/v1/navigations/{slug}/` | Retrieves one navigation structure. |
| `GET` | `/api/v1/media/` | Lists tenant media metadata and URLs. |
| `GET` | `/api/v1/media/{id}/` | Retrieves one media record. |

```bash
curl https://api.yourcms.com/api/v1/pages/about/ \
  -H 'X-Tenant-Key: acme'
```

## Module APIs

Every selectable module is exposed through a discoverable contract:

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/modules/` | Viewer | Enabled resources for the admin application. |
| `GET` | `/api/v1/public/modules/` | Public | Enabled resources available to the consumer site. |
| `GET/POST` | `/api/v1/admin/modules/{module}/{resource}/` | Tenant JWT | Admin list and create. |
| `GET/PUT/PATCH/DELETE` | `/api/v1/admin/modules/{module}/{resource}/{slug}/` | Tenant JWT | Admin detail CRUD. |
| `GET` | `/api/v1/public/modules/{module}/{resource}/` | Public | Published, public records only. |
| `GET` | `/api/v1/public/modules/{module}/{resource}/{slug}/` | Public | Published, public detail. |
| `POST` | `/api/v1/public/modules/{module}/{resource}/` | Public, supported intake resources only | Creates a private draft submission. |

Generic records use `title`, `slug`, `status`, `visibility`, `published_at`,
`sort_order`, and a resource-specific JSON `data` object. Public submissions
cannot set publication fields and are never returned by public reads. The
directory response identifies the exact admin/public endpoint and whether each
resource supports public reads or submissions.

The original Pages, Posts, Navigations, and Media endpoints remain unchanged;
Members are available at `/api/v1/admin/members/`. The frontend client helpers
for generic modules are in `lib/module-api.ts`.

## Global control plane and operations

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET/POST` | `/<DJANGO_ADMIN_URL>/` | Django admin for global users, tenants, deployment logs, schedules, and provisioning. Login required. |
| `POST` | `/users/create/` | Creates a global email/password user. |
| `GET` | `/health/` | Lightweight process check. Returns `ok`. |
| `GET` | `/ping/` | Checks Django and the global database. |
| `GET` | `/test-celery/` | Runs the Celery test task synchronously. Testing/operations only. |
| `GET` | `/swagger/` | Interactive Swagger documentation. |
| `GET` | `/redoc/` | Read-only ReDoc documentation. |

Creating a `TenantSite` in Django admin queues provisioning after the global database transaction commits. Enable **Provision admin frontend** to create a configured deployment from the canonical admin repository. Local settings create a disposable local development instance; production settings create a Vercel project and deployment.

## Response status codes

| Status | Meaning |
| --- | --- |
| `200` | Successful read, update, login, or invitation acceptance. |
| `201` | Resource created. |
| `204` | Resource deleted. |
| `400` | Request validation failed. |
| `401` | JWT is missing, invalid, or expired. |
| `403` | The tenant role is insufficient. |
| `404` | Resource or active tenant was not found. |
| `429` | Nginx rate limit exceeded. |
## Tenant modules

This application is a per-tenant CMS template; it does not create tenants.
Tenant creation and exact module selection happen in Django Admin. Each
generated deployment receives `NEXT_PUBLIC_MODULE_PRESET` and
`NEXT_PUBLIC_ENABLED_MODULES`, then confirms the active configuration through
`GET /api/v1/tenant-config/`. Navigation and dashboard resources render only
when their module is enabled.
