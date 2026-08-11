import { Badge } from "@/components/ui/badge";

const positive = new Set(["active", "approved", "completed", "delivered", "paid", "published", "resolved", "won"]);
const negative = new Set(["cancelled", "failed", "inactive", "overdue", "rejected", "void"]);
const attention = new Set(["draft", "low_stock", "new", "pending", "requested", "submitted"]);

export function StatusBadge({ value, label }: { value?: string | null; label?: string }) {
  const normalized = String(value ?? "unknown").toLowerCase();
  const variant = positive.has(normalized) ? "success" : negative.has(normalized) ? "danger" : attention.has(normalized) ? "warning" : "neutral";
  return <Badge variant={variant}>{label ?? normalized.replaceAll("_", " ")}</Badge>;
}
