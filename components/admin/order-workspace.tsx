"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Banknote,
  Check,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import type { ModuleRecord, ModuleResourceContract } from "@/lib/types";
import { recommendedTransition } from "@/lib/module-operations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/status-badge";

type OrderLine = {
  id?: string | number;
  name?: string;
  description?: string;
  price?: string | number | null;
  unit_price?: string | number | null;
  quantity?: string | number | null;
};

function linesFor(order: ModuleRecord): OrderLine[] {
  const source = Array.isArray(order.line_items)
    ? order.line_items
    : Array.isArray(order.items)
      ? order.items
      : [];
  return source.filter(
    (line): line is OrderLine => Boolean(line && typeof line === "object"),
  );
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderTotal(order: ModuleRecord) {
  const basketTotal = linesFor(order).reduce(
    (total, line) =>
      total +
      numberValue(line.price ?? line.unit_price) *
        Math.max(1, numberValue(line.quantity) || 1),
    0,
  );
  if (basketTotal > 0) return basketTotal;
  const explicit = Number(order.amount);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 0;
}

function money(value: number) {
  return value
    ? new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }).format(value)
    : "Price pending";
}

function customerParts(order: ModuleRecord) {
  const customer = String(order.customer ?? "Walk-in customer").trim();
  const [name, ...phoneParts] = customer.split(/\s+[—–-]\s+/);
  const phone = phoneParts.join(" — ").trim();
  return { name: name || customer, phone };
}

function statusOf(order: ModuleRecord) {
  return typeof order.operational_status === "string" && order.operational_status
    ? order.operational_status
    : "draft";
}

function orderReference(order: ModuleRecord) {
  if (typeof order.order_number === "string" && order.order_number) {
    return order.order_number;
  }
  return `GB-${order.id}`;
}

function fulfillment(order: ModuleRecord) {
  const address = String(order.shipping_address ?? "").trim();
  const delivery = /^Delivery address:/im.test(address);
  const firstLine =
    address.split("\n").find(Boolean) ?? "Fulfillment details not provided";
  return {
    address,
    label: delivery ? "Delivery" : "Pickup",
    detail: firstLine.replace(/^(Delivery address|Pickup branch):\s*/i, ""),
  };
}

function itemSummary(order: ModuleRecord) {
  const lines = linesFor(order);
  const quantity = lines.reduce(
    (sum, line) => sum + Math.max(1, numberValue(line.quantity) || 1),
    0,
  );
  if (!lines.length) return "Items not recorded";
  const first = lines[0]?.name || lines[0]?.description || "Item";
  return lines.length === 1
    ? `${quantity} × ${first}`
    : `${quantity} items · ${first} +${lines.length - 1} more`;
}

export function normalizeOrderRecord(order: ModuleRecord): ModuleRecord {
  if (order.operational_status) return order;
  return { ...order, operational_status: "draft" };
}

export function OrderSummary({
  items,
  totalCount,
}: {
  items: ModuleRecord[];
  totalCount: number;
}) {
  const metrics = useMemo(() => {
    const statuses = items.map(statusOf);
    return [
      {
        label: "All orders",
        value: String(totalCount),
        note: "in this workspace",
        icon: ShoppingBasket,
      },
      {
        label: "Needs confirmation",
        value: String(statuses.filter((status) => status === "draft").length),
        note: "new requests",
        icon: Clock3,
      },
      {
        label: "In progress",
        value: String(
          statuses.filter((status) => ["confirmed", "paid"].includes(status))
            .length,
        ),
        note: "confirmed or paid",
        icon: PackageCheck,
      },
      {
        label: "Order value",
        value: money(items.reduce((sum, order) => sum + orderTotal(order), 0)),
        note: "visible orders",
        icon: Banknote,
      },
    ];
  }, [items, totalCount]);

  return (
    <section
      className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Order overview"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label} className="overflow-hidden">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-0.5 truncate text-xl font-semibold tracking-tight tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {metric.note}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

export function OrderWorkspace({
  items,
  resource,
  mayEdit,
  mayWorkflow,
  busyRecord,
  onEdit,
  onAction,
}: {
  items: ModuleRecord[];
  resource?: ModuleResourceContract;
  mayEdit: boolean;
  mayWorkflow: boolean;
  busyRecord?: string;
  onEdit: (item: ModuleRecord) => void;
  onAction: (item: ModuleRecord, action: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<ModuleRecord["id"]>();
  const selected = items.find((item) => item.id === selectedId);

  return (
    <>
      <div className="motion-list divide-y">
        {items.map((order) => {
          const customer = customerParts(order);
          const service = fulfillment(order);
          const status = statusOf(order);
          const next = recommendedTransition("orders", "orders", status);
          const busy = busyRecord === String(order.id);

          return (
            <article
              key={String(order.id)}
              className="group grid gap-4 p-4 transition-colors duration-150 hover:bg-muted/30 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.15fr)_minmax(180px,.7fr)_auto] lg:items-center"
            >
              <button
                type="button"
                onClick={() => setSelectedId(order.id)}
                className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold tracking-tight">
                    {orderReference(order)}
                  </span>
                  <StatusBadge
                    value={status}
                    label={status === "draft" ? "Needs confirmation" : undefined}
                  />
                </span>
                <span className="mt-1.5 block truncate text-sm font-medium">
                  {customer.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {itemSummary(order)}
                </p>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {service.label === "Delivery" ? (
                    <Truck className="size-3.5 shrink-0" />
                  ) : (
                    <Store className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {service.label} · {service.detail}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-base font-semibold tabular-nums">
                  {money(orderTotal(order))}
                </p>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="size-3.5" /> {customer.phone}
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No phone number
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                {mayWorkflow && next ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onAction(order, `set-${next.target}`)}
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {next.label}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={() => setSelectedId(order.id)}
                  aria-label={`View ${orderReference(order)}`}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <OrderDetails
        order={selected}
        resource={resource}
        mayEdit={mayEdit}
        mayWorkflow={mayWorkflow}
        busy={Boolean(selected && busyRecord === String(selected.id))}
        onClose={() => setSelectedId(undefined)}
        onEdit={(order) => {
          setSelectedId(undefined);
          onEdit(order);
        }}
        onAction={onAction}
      />
    </>
  );
}

function OrderDetails({
  order,
  resource,
  mayEdit,
  mayWorkflow,
  busy,
  onClose,
  onEdit,
  onAction,
}: {
  order?: ModuleRecord;
  resource?: ModuleResourceContract;
  mayEdit: boolean;
  mayWorkflow: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: (order: ModuleRecord) => void;
  onAction: (order: ModuleRecord, action: string) => void;
}) {
  if (!order) return null;
  const customer = customerParts(order);
  const service = fulfillment(order);
  const status = statusOf(order);
  const lines = linesFor(order);
  const next = recommendedTransition("orders", "orders", status);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0">
        <div className="border-b px-5 py-5 pr-14 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{orderReference(order)}</DialogTitle>
            <StatusBadge
              value={status}
              label={status === "draft" ? "Needs confirmation" : undefined}
            />
          </div>
          <DialogDescription>
            Received {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.25fr_.75fr]">
          <section className="border-b p-5 md:border-b-0 md:border-r sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Order items</h3>
              <span className="text-lg font-semibold tabular-nums">
                {money(orderTotal(order))}
              </span>
            </div>
            {lines.length ? (
              <ul className="mt-4 divide-y rounded-lg border">
                {lines.map((line, index) => {
                  const quantity = Math.max(
                    1,
                    numberValue(line.quantity) || 1,
                  );
                  const price = numberValue(line.price ?? line.unit_price);
                  return (
                    <li
                      key={`${line.id ?? line.name ?? index}`}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {line.name || line.description || `Item ${index + 1}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Quantity {quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {price ? money(price * quantity) : "Price pending"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                This older submission has no structured item list.
              </p>
            )}

            <div className="mt-5">
              <h3 className="text-sm font-semibold">Fulfillment</h3>
              <div className="mt-3 flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                {service.label === "Delivery" ? (
                  <Truck className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <Store className="mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{service.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {service.address ||
                      "No pickup or delivery notes were provided."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Customer</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="mt-0.5 font-medium">{customer.name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="mt-0.5 font-medium">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Fulfillment</dt>
                  <dd className="mt-0.5 font-medium">{service.label}</dd>
                </div>
              </div>
            </dl>

            {mayWorkflow && resource?.workflow?.length ? (
              <div className="mt-6 border-t pt-5">
                <label
                  htmlFor="order-status"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Order status
                </label>
                <select
                  id="order-status"
                  value={status}
                  disabled={busy}
                  onChange={(event) =>
                    onAction(order, `set-${event.target.value}`)
                  }
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {resource.workflow.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {mayEdit ? (
              <Button variant="outline" onClick={() => onEdit(order)}>
                <Pencil className="size-4" /> Edit details
              </Button>
            ) : null}
            {mayWorkflow && next ? (
              <Button
                disabled={busy}
                onClick={() => onAction(order, `set-${next.target}`)}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {next.label}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
