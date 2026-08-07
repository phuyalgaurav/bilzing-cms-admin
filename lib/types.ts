export type Role = "viewer" | "editor" | "super_admin";
export type ContentStatus = "draft" | "published";
export type ModuleRecordStatus = ContentStatus | "archived";

export interface TenantTheme {
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  surface_color?: string;
  text_color?: string;
  muted_text_color?: string;
  font_family?: string;
  heading_font_family?: string;
  border_radius?: string;
  sidebar_position?: "left" | "right";
  sidebar_style?: "solid" | "soft";
  login_background_url?: string;
  support_url?: string;
}

export interface TenantConfig {
  tenant_key: string;
  name: string;
  admin_theme: TenantTheme;
  module_preset: string;
  enabled_modules: string[];
}

export interface ContentRecord {
  id?: number | string;
  title: string;
  slug: string;
  status: ContentStatus;
  excerpt?: string;
  content?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  author_name?: string;
  featured_image?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

export interface NavigationRecord {
  id?: number | string;
  name: string;
  slug: string;
  items: Array<{ label: string; href: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface MediaRecord {
  id: number | string;
  title: string;
  file?: string;
  url?: string;
  alt_text?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface Paginated<T> { count: number; results: T[] }

export interface ModuleRecord {
  id: number | string;
  module_key: string;
  resource_type: string;
  title: string;
  slug: string;
  status: ModuleRecordStatus;
  visibility: "public" | "private";
  published_at?: string | null;
  sort_order: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModuleResourceContract {
  key: string;
  admin_endpoint: string;
  public_endpoint: string;
  public_read: boolean;
  public_create: boolean;
}

export interface ModuleContract {
  key: string;
  name: string;
  description: string;
  resources: ModuleResourceContract[];
}
