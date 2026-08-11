import { PageHeader } from "@/components/admin/page-header";

export function PageHeading({
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return <PageHeader title={title} description={description} actions={actions} />;
}
