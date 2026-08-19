const NOW = new Date("2026-08-20T00:00:00Z");
const NON_REFUNDABLE_CATEGORIES = ["digital-goods", "gift-card", "final-sale"];

function daysBetween(fromISO, toDate) {
  const from = new Date(fromISO);
  return Math.floor((toDate - from) / (1000 * 60 * 60 * 24));
}

/**
 * Deterministic policy engine. The agent calls this as a tool rather than
 * reasoning about dates/categories itself, so refund decisions are always
 * grounded in the actual policy rules instead of an LLM guess.
 */
export function evaluateRefundEligibility(customer, order) {
  const reasons = [];

  if (order.refunded) {
    return {
      decision: "deny",
      reasons: ["This order has already been refunded (duplicate request)."],
    };
  }

  if (NON_REFUNDABLE_CATEGORIES.includes(order.category)) {
    return {
      decision: "deny",
      reasons: [
        `Category "${order.category}" is non-refundable under policy rule 3, regardless of delivery date or condition.`,
      ],
    };
  }

  if (order.status !== "delivered") {
    return {
      decision: "deny",
      reasons: [
        `Order status is "${order.status}", not "delivered". Only delivered orders are eligible (policy rule 2).`,
      ],
    };
  }

  if (customer.refundsLast90Days >= 3) {
    return {
      decision: "escalate",
      reasons: [
        `Customer has ${customer.refundsLast90Days} refunds in the trailing 90 days, triggering the fraud/abuse guard (policy rule 6). Requires human review.`,
      ],
    };
  }

  if (order.price > 500) {
    return {
      decision: "escalate",
      reasons: [
        `Order total $${order.price.toFixed(2)} exceeds the $500 auto-approval limit (policy rule 5). Requires manual approval.`,
      ],
    };
  }

  const windowDays = order.damaged ? 45 : 30;
  const daysSinceDelivery = daysBetween(order.deliveryDate, NOW);

  if (daysSinceDelivery <= windowDays) {
    reasons.push(
      order.damaged
        ? `Item reported damaged/defective: extended 45-day window applies (policy rule 4). Delivered ${daysSinceDelivery} days ago.`
        : `Delivered ${daysSinceDelivery} days ago, within the standard 30-day window (policy rule 1).`
    );
    return { decision: "approve", reasons };
  }

  return {
    decision: "deny",
    reasons: [
      `Delivered ${daysSinceDelivery} days ago, which exceeds the ${windowDays}-day eligibility window (policy rule ${
        order.damaged ? "4" : "1"
      }).`,
    ],
  };
}
