import { findCustomerByQuery, findOrder, applyRefundDecision } from "@/lib/store";
import { evaluateRefundEligibility } from "@/lib/policy";

// JSON-schema tool definitions in the OpenAI/Groq function-calling format.
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "lookup_customer",
      description:
        "Look up a customer by customer ID, email, full name, or order ID. Returns the customer profile and their order history.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Customer ID, email, name, or order ID to search for.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Fetch full details for a specific order by order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID, e.g. ORD-1001." },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_refund_eligibility",
      description:
        "Run the order through the official refund policy engine. Always call this before approving, denying, or escalating a refund — never decide from memory.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID to evaluate." },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_refund",
      description:
        "Approve and process a refund for an order. Only call this after check_refund_eligibility returned decision=approve.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string", description: "Short justification for the approval." },
        },
        required: ["orderId", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deny_refund",
      description:
        "Deny a refund request. Only call this after check_refund_eligibility returned decision=deny.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string", description: "Short justification for the denial." },
        },
        required: ["orderId", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description:
        "Escalate the request to a human agent. Only call this after check_refund_eligibility returned decision=escalate.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string", description: "Why this needs human review." },
        },
        required: ["orderId", "reason"],
      },
    },
  },
];

export function executeTool(name, args) {
  switch (name) {
    case "lookup_customer": {
      const customer = findCustomerByQuery(args.query);
      if (!customer) return { error: `No customer found matching "${args.query}".` };
      return { customer };
    }
    case "get_order": {
      const found = findOrder(args.orderId);
      if (!found) return { error: `No order found with ID "${args.orderId}".` };
      return { order: found.order, customerId: found.customer.id };
    }
    case "check_refund_eligibility": {
      const found = findOrder(args.orderId);
      if (!found) return { error: `No order found with ID "${args.orderId}".` };
      const result = evaluateRefundEligibility(found.customer, found.order);
      return { orderId: args.orderId, ...result };
    }
    case "process_refund": {
      const found = findOrder(args.orderId);
      if (!found) return { error: `No order found with ID "${args.orderId}".` };
      const eligibility = evaluateRefundEligibility(found.customer, found.order);
      if (eligibility.decision !== "approve") {
        return {
          error: `Refusing to process refund: policy engine says "${eligibility.decision}", not "approve". Call check_refund_eligibility first and respect its result.`,
        };
      }
      applyRefundDecision(args.orderId, "approved");
      return {
        status: "approved",
        orderId: args.orderId,
        reason: args.reason,
        message: "Refund processed. Funds will be returned to the original payment method in 5-7 business days.",
      };
    }
    case "deny_refund": {
      const found = findOrder(args.orderId);
      if (!found) return { error: `No order found with ID "${args.orderId}".` };
      return { status: "denied", orderId: args.orderId, reason: args.reason };
    }
    case "escalate_to_human": {
      const found = findOrder(args.orderId);
      if (!found) return { error: `No order found with ID "${args.orderId}".` };
      return { status: "escalated", orderId: args.orderId, reason: args.reason };
    }
    default:
      return { error: `Unknown tool "${name}".` };
  }
}
