import {
  Activity,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  ContactRound,
  CreditCard,
  FileCheck2,
  FileSearch,
  GalleryHorizontalEnd,
  GraduationCap,
  HelpCircle,
  House,
  ImageIcon,
  MapPin,
  Megaphone,
  MessageSquareText,
  Newspaper,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  SearchCheck,
  Settings2,
  ShoppingBasket,
  Star,
  Stethoscope,
  Tags,
  Truck,
  UserRoundCheck,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type ResourceView =
  | "catalog"
  | "directory"
  | "inbox"
  | "pipeline"
  | "ledger"
  | "calendar"
  | "gallery"
  | "settings"
  | "content";

export interface ResourceExperience {
  singular: string;
  plural: string;
  description: string;
  view: ResourceView;
  primaryFields?: string[];
  createLabel?: string;
  emptyMessage?: string;
  singleton?: boolean;
}

export interface ModuleExperience {
  label: string;
  description: string;
  primaryResource: string;
  icon: LucideIcon;
  resources: Record<string, ResourceExperience>;
}

const resource = (
  singular: string,
  plural: string,
  description: string,
  view: ResourceView,
  primaryFields: string[] = [],
  createLabel?: string,
): ResourceExperience => ({
  singular,
  plural,
  description,
  view,
  primaryFields,
  createLabel,
});

export const moduleExperiences: Record<string, ModuleExperience> = {
  website_pages: {
    label: "Website",
    description: "Publish pages and control the site navigation.",
    primaryResource: "pages",
    icon: House,
    resources: {
      pages: resource(
        "page",
        "pages",
        "Draft and publish website pages.",
        "content",
      ),
      navigations: resource(
        "menu",
        "navigation",
        "Build header and footer menus.",
        "settings",
      ),
    },
  },
  media_library: {
    label: "Media",
    description: "Upload and reuse images and documents.",
    primaryResource: "media",
    icon: ImageIcon,
    resources: {
      media: resource(
        "file",
        "media",
        "Find and manage uploaded files.",
        "gallery",
      ),
    },
  },
  user_management: {
    label: "Users & roles",
    description: "Invite employees and control workspace access.",
    primaryResource: "members",
    icon: UsersRound,
    resources: {
      members: resource(
        "member",
        "members",
        "Manage tenant employees and permissions.",
        "directory",
      ),
    },
  },
  settings: {
    label: "Business settings",
    description: "Keep business identity and social links current.",
    primaryResource: "business-profile",
    icon: Settings2,
    resources: {
      "business-profile": {
        ...resource(
          "profile",
          "business profile",
          "Edit public business details.",
          "settings",
          ["email", "phone", "url"],
        ),
        singleton: true,
      },
      "social-links": resource(
        "social link",
        "social links",
        "Manage social profiles in one place.",
        "settings",
        ["platform", "handle", "url"],
      ),
    },
  },
  contact_management: {
    label: "Inbox",
    description: "Receive, assign, and resolve customer inquiries.",
    primaryResource: "inquiries",
    icon: MessageSquareText,
    resources: {
      inquiries: resource(
        "inquiry",
        "inquiries",
        "Work through new customer messages.",
        "inbox",
        ["name", "email", "phone"],
        "New inquiry",
      ),
      forms: resource(
        "form",
        "forms",
        "Configure website contact forms.",
        "settings",
        ["name", "email", "operational_status"],
      ),
    },
  },
  seo_management: {
    label: "SEO",
    description: "Control search metadata, redirects, and structured data.",
    primaryResource: "seo-settings",
    icon: SearchCheck,
    resources: {
      "seo-settings": resource(
        "SEO entry",
        "page SEO",
        "Improve how pages appear in search.",
        "settings",
        ["page", "meta_title", "canonical_url"],
      ),
      redirects: resource(
        "redirect",
        "redirects",
        "Send old URLs to the right destination.",
        "settings",
        ["from_path", "to_path", "code"],
      ),
      schema: resource(
        "schema entry",
        "structured data",
        "Manage JSON-LD search data.",
        "settings",
        ["schema_type"],
      ),
    },
  },
  analytics: {
    label: "Analytics",
    description: "Inspect tracked activity and saved reports.",
    primaryResource: "reports",
    icon: ChartNoAxesCombined,
    resources: {
      reports: resource(
        "report",
        "reports",
        "Save focused reporting views.",
        "content",
        ["name", "date"],
      ),
      events: resource(
        "event",
        "tracked events",
        "Inspect incoming website activity.",
        "content",
        ["event_name", "occurred_at", "source"],
      ),
    },
  },
  notifications: {
    label: "Notifications",
    description: "Manage message templates and recipient subscriptions.",
    primaryResource: "templates",
    icon: Bell,
    resources: {
      templates: resource(
        "template",
        "templates",
        "Write reusable email and SMS content.",
        "content",
        ["subject", "operational_status"],
      ),
      subscriptions: resource(
        "subscription",
        "subscriptions",
        "Control notification recipients and channels.",
        "directory",
        ["email", "channel", "operational_status"],
      ),
    },
  },
  blog: {
    label: "Blog & news",
    description: "Write posts and organize editorial contributors.",
    primaryResource: "posts",
    icon: Newspaper,
    resources: {
      posts: resource(
        "post",
        "posts",
        "Draft, schedule, and publish articles.",
        "content",
      ),
      authors: resource(
        "author",
        "authors",
        "Manage contributor profiles.",
        "directory",
        ["name", "email", "url"],
      ),
      categories: resource(
        "category",
        "categories",
        "Organize posts for readers.",
        "settings",
        ["name"],
      ),
    },
  },
  team_management: {
    label: "Team",
    description: "Maintain staff profiles and departments.",
    primaryResource: "team-members",
    icon: ContactRound,
    resources: {
      "team-members": resource(
        "team member",
        "team",
        "Publish staff profiles and availability.",
        "directory",
        ["role", "email", "phone"],
      ),
      departments: resource(
        "department",
        "departments",
        "Group staff by responsibility.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  service_catalog: {
    label: "Services",
    description: "Package services with prices and availability.",
    primaryResource: "services",
    icon: BriefcaseBusiness,
    resources: {
      services: resource(
        "service",
        "services",
        "Manage what customers can book or request.",
        "catalog",
        ["price", "duration", "operational_status"],
      ),
      "service-categories": resource(
        "category",
        "categories",
        "Keep the service catalog organized.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  product_catalog: {
    label: "Products",
    description: "Manage products, variants, pricing, and categories.",
    primaryResource: "products",
    icon: ShoppingBasket,
    resources: {
      products: resource(
        "product",
        "products",
        "Maintain the sellable product catalog.",
        "catalog",
        ["price", "sku", "quantity"],
      ),
      variants: resource(
        "variant",
        "variants",
        "Manage product options and SKUs.",
        "catalog",
        ["sku", "price"],
      ),
      "product-categories": resource(
        "category",
        "categories",
        "Group products for browsing.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  inventory: {
    label: "Inventory",
    description: "Monitor stock, suppliers, and storage locations.",
    primaryResource: "stock-items",
    icon: Boxes,
    resources: {
      "stock-items": resource(
        "stock item",
        "stock",
        "Track quantities and stock movements.",
        "ledger",
        ["sku", "quantity", "reorder_level"],
      ),
      suppliers: resource(
        "supplier",
        "suppliers",
        "Maintain supplier contacts.",
        "directory",
        ["email", "phone", "operational_status"],
      ),
      warehouses: resource(
        "warehouse",
        "warehouses",
        "Manage stock locations.",
        "directory",
        ["address", "phone", "operational_status"],
      ),
    },
  },
  orders: {
    label: "Orders",
    description: "Move orders from draft through fulfillment.",
    primaryResource: "orders",
    icon: PackageCheck,
    resources: {
      orders: resource(
        "order",
        "orders",
        "Review totals, customers, and fulfillment state.",
        "pipeline",
        ["customer", "amount", "shipping_address"],
        "Create order",
      ),
    },
  },
  payments: {
    label: "Payments",
    description: "Track payment requests, methods, refunds, and outcomes.",
    primaryResource: "payment-requests",
    icon: CreditCard,
    resources: {
      "payment-requests": resource(
        "payment",
        "payment requests",
        "Monitor money due and payment outcomes.",
        "ledger",
        ["order_id", "amount", "currency"],
      ),
      "payment-methods": resource(
        "payment method",
        "payment methods",
        "Configure accepted payment options.",
        "settings",
        ["provider", "operational_status"],
      ),
    },
  },
  delivery: {
    label: "Delivery",
    description: "Dispatch deliveries and configure service zones.",
    primaryResource: "deliveries",
    icon: Truck,
    resources: {
      deliveries: resource(
        "delivery",
        "deliveries",
        "Track dispatch and delivery progress.",
        "pipeline",
        ["order_id", "date", "address"],
      ),
      "delivery-zones": resource(
        "zone",
        "delivery zones",
        "Set coverage and delivery fees.",
        "settings",
        ["amount", "operational_status"],
      ),
    },
  },
  booking: {
    label: "Bookings",
    description: "Run appointments and manage available time.",
    primaryResource: "appointments",
    icon: CalendarDays,
    resources: {
      appointments: resource(
        "appointment",
        "appointments",
        "Confirm and complete customer bookings.",
        "calendar",
        ["customer", "date", "start_time"],
      ),
      availability: resource(
        "time slot",
        "availability",
        "Open bookable dates and capacity.",
        "calendar",
        ["date", "start_time", "end_time"],
      ),
    },
  },
  customer_management: {
    label: "Customers",
    description: "Keep customer contact details and notes together.",
    primaryResource: "customers",
    icon: UserRoundCheck,
    resources: {
      customers: resource(
        "customer",
        "customers",
        "Maintain customer profiles and history.",
        "directory",
        ["email", "phone", "address"],
      ),
    },
  },
  reviews: {
    label: "Reviews",
    description: "Moderate ratings and customer testimonials.",
    primaryResource: "reviews",
    icon: Star,
    resources: {
      reviews: resource(
        "review",
        "reviews",
        "Approve, reject, and publish feedback.",
        "inbox",
        ["author", "rating", "comment"],
      ),
    },
  },
  offers: {
    label: "Offers",
    description: "Create discounts with clear dates and limits.",
    primaryResource: "offers",
    icon: Tags,
    resources: {
      offers: resource(
        "offer",
        "offers",
        "Launch and retire promotions.",
        "catalog",
        ["discount", "date", "operational_status"],
      ),
    },
  },
  membership: {
    label: "Memberships",
    description: "Manage plans and member lifecycle.",
    primaryResource: "memberships",
    icon: UsersRound,
    resources: {
      memberships: resource(
        "membership",
        "memberships",
        "Track active, suspended, and expired members.",
        "pipeline",
        ["customer", "plan", "date"],
      ),
      plans: resource(
        "plan",
        "plans",
        "Define benefits, pricing, and renewal intervals.",
        "catalog",
        ["price", "interval", "operational_status"],
      ),
    },
  },
  document_management: {
    label: "Documents",
    description: "Store controlled documents and their versions.",
    primaryResource: "documents",
    icon: FileCheck2,
    resources: {
      documents: resource(
        "document",
        "documents",
        "Upload files and maintain version history.",
        "content",
        ["file_type", "url"],
      ),
    },
  },
  gallery: {
    label: "Gallery & portfolio",
    description: "Curate visual work into albums and projects.",
    primaryResource: "gallery-items",
    icon: GalleryHorizontalEnd,
    resources: {
      "gallery-items": resource(
        "gallery item",
        "gallery",
        "Manage images, video, and alt text.",
        "gallery",
        ["url", "alt_text"],
      ),
      albums: resource(
        "album",
        "albums",
        "Group media into collections.",
        "gallery",
        ["url"],
      ),
      projects: resource(
        "project",
        "projects",
        "Present portfolio case studies.",
        "catalog",
        ["url", "operational_status"],
      ),
    },
  },
  location_management: {
    label: "Locations",
    description: "Maintain branches, addresses, and map details.",
    primaryResource: "locations",
    icon: MapPin,
    resources: {
      locations: resource(
        "location",
        "locations",
        "Manage public branch information.",
        "directory",
        ["address", "phone", "latitude"],
      ),
    },
  },
  crm: {
    label: "CRM",
    description: "Qualify leads and move opportunities through the pipeline.",
    primaryResource: "leads",
    icon: Activity,
    resources: {
      leads: resource(
        "lead",
        "leads",
        "Prioritize follow-ups and conversions.",
        "pipeline",
        ["company", "email", "phone"],
        "Add lead",
      ),
      pipelines: resource(
        "pipeline",
        "pipelines",
        "Configure sales stages.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  quotation: {
    label: "Quotations",
    description: "Turn incoming requests into priced proposals.",
    primaryResource: "quote-requests",
    icon: FileSearch,
    resources: {
      "quote-requests": resource(
        "request",
        "quote requests",
        "Review and respond to pricing requests.",
        "inbox",
        ["name", "email", "requirements"],
      ),
      quotations: resource(
        "quotation",
        "quotations",
        "Prepare itemized customer proposals.",
        "ledger",
        ["customer", "amount"],
      ),
    },
  },
  invoice: {
    label: "Invoices",
    description: "Issue invoices and track what is due.",
    primaryResource: "invoices",
    icon: ReceiptText,
    resources: {
      invoices: resource(
        "invoice",
        "invoices",
        "Track sent, paid, and overdue invoices.",
        "ledger",
        ["customer", "amount", "due_date"],
      ),
    },
  },
  subscription: {
    label: "Subscriptions",
    description: "Operate recurring plans and subscriber lifecycle.",
    primaryResource: "subscriptions",
    icon: CircleDollarSign,
    resources: {
      subscriptions: resource(
        "subscription",
        "subscriptions",
        "Monitor recurring customer agreements.",
        "pipeline",
        ["customer", "plan", "date"],
      ),
      plans: resource(
        "plan",
        "plans",
        "Define recurring price and billing interval.",
        "catalog",
        ["price", "interval", "operational_status"],
      ),
    },
  },
  events: {
    label: "Events",
    description: "Schedule events and manage registrations.",
    primaryResource: "events",
    icon: Megaphone,
    resources: {
      events: resource(
        "event",
        "events",
        "Publish dates, locations, and capacity.",
        "calendar",
        ["date", "start_time", "location"],
      ),
      registrations: resource(
        "registration",
        "registrations",
        "Confirm and check in attendees.",
        "inbox",
        ["event", "attendee", "email"],
      ),
    },
  },
  faq: {
    label: "FAQs",
    description: "Publish clear answers grouped by topic.",
    primaryResource: "faqs",
    icon: HelpCircle,
    resources: {
      faqs: resource(
        "FAQ",
        "FAQs",
        "Write and publish customer answers.",
        "content",
        ["question", "operational_status"],
      ),
      "faq-categories": resource(
        "category",
        "categories",
        "Organize answers by topic.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  patient_records: {
    label: "Patient records",
    description: "Manage patient profiles and treatment activity.",
    primaryResource: "patients",
    icon: Stethoscope,
    resources: {
      patients: resource(
        "patient",
        "patients",
        "Keep patient contact and lifecycle details current.",
        "directory",
        ["email", "phone", "date_of_birth"],
      ),
      treatments: resource(
        "treatment",
        "treatments",
        "Track planned and completed care.",
        "pipeline",
        ["patient", "treatment", "date"],
      ),
    },
  },
  room_management: {
    label: "Rooms",
    description: "Track room types, availability, and occupancy.",
    primaryResource: "rooms",
    icon: Building2,
    resources: {
      rooms: resource(
        "room",
        "rooms",
        "Operate room availability and maintenance.",
        "catalog",
        ["room_type", "capacity"],
      ),
      "room-types": resource(
        "room type",
        "room types",
        "Define room categories and capacities.",
        "settings",
        ["capacity"],
      ),
    },
  },
  admissions: {
    label: "Admissions",
    description: "Review applicants and manage available programs.",
    primaryResource: "applications",
    icon: ClipboardList,
    resources: {
      applications: resource(
        "application",
        "applications",
        "Move applicants through review and enrollment.",
        "pipeline",
        ["applicant", "program", "email"],
      ),
      programs: resource(
        "program",
        "programs",
        "Publish programs and fees.",
        "catalog",
        ["price", "operational_status"],
      ),
    },
  },
  student_management: {
    label: "Students",
    description: "Manage students, classes, and attendance.",
    primaryResource: "students",
    icon: GraduationCap,
    resources: {
      students: resource(
        "student",
        "students",
        "Maintain enrollment and attendance records.",
        "directory",
        ["email", "program"],
      ),
      classes: resource(
        "class",
        "classes",
        "Schedule classes and record attendance.",
        "calendar",
        ["teacher", "date", "operational_status"],
      ),
    },
  },
  case_management: {
    label: "Cases",
    description: "Track client matters, progress, and notes.",
    primaryResource: "cases",
    icon: BriefcaseBusiness,
    resources: {
      cases: resource(
        "case",
        "cases",
        "Move legal matters from opening to resolution.",
        "pipeline",
        ["client", "notes"],
      ),
    },
  },
  menu_management: {
    label: "Menu",
    description: "Manage sections, dishes, prices, and availability.",
    primaryResource: "menu-items",
    icon: UtensilsCrossed,
    resources: {
      "menu-items": resource(
        "menu item",
        "menu items",
        "Keep dishes, prices, and availability current.",
        "catalog",
        ["price", "section", "operational_status"],
      ),
      "menu-sections": resource(
        "menu section",
        "menu sections",
        "Organize the customer menu.",
        "settings",
        ["name", "operational_status"],
      ),
    },
  },
  property_listings: {
    label: "Properties",
    description: "Publish listings and respond to property inquiries.",
    primaryResource: "properties",
    icon: Building2,
    resources: {
      properties: resource(
        "property",
        "properties",
        "Manage listing details, price, and availability.",
        "catalog",
        ["price", "address", "operational_status"],
      ),
      "property-inquiries": resource(
        "inquiry",
        "property inquiries",
        "Follow up with interested buyers and tenants.",
        "inbox",
        ["email", "phone", "property"],
      ),
    },
  },
};

export function moduleExperience(moduleKey: string): ModuleExperience {
  return (
    moduleExperiences[moduleKey] ?? {
      label: titleCase(moduleKey),
      description: "",
      primaryResource: "",
      icon: PackageOpen,
      resources: {},
    }
  );
}

export function resourceExperience(
  moduleKey: string,
  resourceKey: string,
): ResourceExperience {
  return (
    moduleExperience(moduleKey).resources[resourceKey] ??
    resource(
      titleCase(resourceKey).replace(/s$/, ""),
      titleCase(resourceKey),
      `Manage ${titleCase(resourceKey).toLowerCase()}.`,
      "content",
    )
  );
}

export function modulePrimaryPath(moduleKey: string) {
  const primary = moduleExperience(moduleKey).primaryResource;
  return primary ? `/modules/${moduleKey}/${primary}` : `/modules/${moduleKey}`;
}

export function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
