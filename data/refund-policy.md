# Refund Policy (Reference: 2026-08-20)

This is the authoritative refund policy for the support agent. All refund
decisions must be justified against these rules — never approve or deny a
refund based on general knowledge.

1. **Eligibility window** — Items may be refunded within **30 days** of the
   delivery date.
2. **Order status** — Only orders with status `delivered` are eligible for a
   new refund request. Orders that are `processing`, `cancelled`, or already
   `returned` are not eligible.
3. **Non-refundable categories** — `digital-goods`, `gift-card`, and
   `final-sale` items are non-refundable under any circumstance, regardless
   of the delivery date or condition.
4. **Damaged / defective exception** — If the customer reports the item as
   damaged or defective, the eligibility window is extended to **45 days**
   from delivery, and the request should be prioritized.
5. **High-value orders** — Orders with a price **over $500** must be
   escalated to a human agent for manual approval. The agent must never
   auto-approve these — only recommend approval or denial and escalate.
6. **Fraud / abuse guard** — If the customer already has **3 or more**
   refunds processed in the trailing 90 days, the request must be escalated
   to a human agent regardless of other eligibility factors.
7. **Duplicate requests** — An order that has already been refunded
   (`refunded: true`) cannot be refunded again.
8. **Refund method** — Approved refunds are issued to the original payment
   method within 5–7 business days.

## Decision priority

When multiple rules apply, evaluate in this order:

1. Duplicate request (rule 7) → deny
2. Non-refundable category (rule 3) → deny
3. Order status not `delivered` (rule 2) → deny
4. Fraud guard (rule 6) → escalate
5. High-value order (rule 5) → escalate
6. Eligibility window, with damaged-item extension (rules 1 & 4) → approve or deny
