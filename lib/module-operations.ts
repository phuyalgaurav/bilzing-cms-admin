export interface RecommendedTransition {
  target: string;
  label: string;
}

const transitions: Record<string, Record<string, RecommendedTransition>> = {
  "contact_management/inquiries": {
    new: { target: "in_progress", label: "Start work" },
    in_progress: { target: "resolved", label: "Resolve" },
    resolved: { target: "closed", label: "Close" },
  },
  "inventory/stock-items": {
    in_stock: { target: "low_stock", label: "Mark low stock" },
    low_stock: { target: "out_of_stock", label: "Mark out of stock" },
    out_of_stock: { target: "in_stock", label: "Mark restocked" },
  },
  "orders/orders": {
    draft: { target: "confirmed", label: "Confirm order" },
    confirmed: { target: "paid", label: "Mark paid" },
    paid: { target: "fulfilled", label: "Fulfill order" },
  },
  "payments/payment-requests": {
    pending: { target: "paid", label: "Mark paid" },
    paid: { target: "refunded", label: "Refund" },
    failed: { target: "pending", label: "Retry payment" },
  },
  "delivery/deliveries": {
    pending: { target: "dispatched", label: "Dispatch" },
    dispatched: { target: "delivered", label: "Mark delivered" },
    failed: { target: "pending", label: "Retry delivery" },
  },
  "booking/appointments": {
    requested: { target: "confirmed", label: "Confirm booking" },
    confirmed: { target: "completed", label: "Complete booking" },
  },
  "reviews/reviews": {
    pending: { target: "approved", label: "Approve review" },
  },
  "membership/memberships": {
    pending: { target: "active", label: "Activate membership" },
    active: { target: "suspended", label: "Suspend membership" },
    suspended: { target: "active", label: "Reactivate" },
  },
  "crm/leads": {
    new: { target: "qualified", label: "Qualify lead" },
    qualified: { target: "proposal", label: "Create proposal" },
    proposal: { target: "won", label: "Mark won" },
  },
  "quotation/quote-requests": {
    new: { target: "reviewing", label: "Start review" },
    reviewing: { target: "quoted", label: "Mark quoted" },
    quoted: { target: "closed", label: "Close request" },
  },
  "quotation/quotations": {
    draft: { target: "sent", label: "Mark sent" },
    sent: { target: "accepted", label: "Mark accepted" },
  },
  "invoice/invoices": {
    draft: { target: "sent", label: "Mark sent" },
    sent: { target: "paid", label: "Mark paid" },
    overdue: { target: "paid", label: "Mark paid" },
  },
  "subscription/subscriptions": {
    pending: { target: "active", label: "Activate subscription" },
    active: { target: "paused", label: "Pause subscription" },
    paused: { target: "active", label: "Resume subscription" },
  },
  "events/registrations": {
    pending: { target: "confirmed", label: "Confirm registration" },
    confirmed: { target: "checked_in", label: "Check in" },
  },
  "admissions/applications": {
    submitted: { target: "under_review", label: "Start review" },
    under_review: { target: "accepted", label: "Accept application" },
    accepted: { target: "enrolled", label: "Enroll student" },
  },
  "case_management/cases": {
    open: { target: "in_progress", label: "Start case" },
    in_progress: { target: "resolved", label: "Resolve case" },
    resolved: { target: "closed", label: "Close case" },
  },
  "property_listings/property-inquiries": {
    new: { target: "contacted", label: "Mark contacted" },
    contacted: { target: "viewing", label: "Schedule viewing" },
    viewing: { target: "closed", label: "Close inquiry" },
  },
  "patient_records/patients": {
    active: { target: "discharged", label: "Discharge patient" },
    inactive: { target: "active", label: "Reactivate patient" },
  },
  "patient_records/treatments": {
    planned: { target: "in_progress", label: "Start treatment" },
    in_progress: { target: "completed", label: "Complete treatment" },
  },
  "room_management/rooms": {
    available: { target: "occupied", label: "Mark occupied" },
    occupied: { target: "available", label: "Mark available" },
    maintenance: { target: "available", label: "Return to service" },
  },
  "student_management/students": {
    applicant: { target: "active", label: "Activate student" },
    active: { target: "graduated", label: "Mark graduated" },
  },
};

export function recommendedTransition(
  moduleKey: string | undefined,
  resourceKey: string | undefined,
  currentStatus: unknown,
) {
  if (!moduleKey || !resourceKey || typeof currentStatus !== "string")
    return undefined;
  return transitions[`${moduleKey}/${resourceKey}`]?.[currentStatus];
}
