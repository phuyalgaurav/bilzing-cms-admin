import { Users } from "lucide-react";
import { PageHeading } from "@/components/admin-shell/page-heading";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
export default function MembersPage() { return <><PageHeading eyebrow="Workspace" title="Members" description="Member and role management will appear here when the backend endpoint is available." /><Card><EmptyState icon={Users} title="Member management is coming soon" description="The interface is ready for the tenant members endpoint. Until then, manage access from the global CMS admin." /></Card></>; }
