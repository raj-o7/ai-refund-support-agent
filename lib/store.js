import customersSeed from "@/data/customers.json";

// Module-level in-memory store. Persists for the life of the server
// process (fine for a demo/take-home; a real deployment would use a DB).
const globalStore = globalThis;

if (!globalStore.__refundAgentState) {
  globalStore.__refundAgentState = {
    customers: structuredClone(customersSeed),
    conversations: new Map(), // conversationId -> { messages: [], createdAt }
    logs: new Map(), // conversationId -> logEntry[]
  };
}

const state = globalStore.__refundAgentState;

export function listCustomers() {
  return state.customers;
}

export function findCustomerByQuery(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  return (
    state.customers.find(
      (c) =>
        c.id.toLowerCase() === q ||
        c.email.toLowerCase() === q ||
        c.name.toLowerCase() === q ||
        c.orders.some((o) => o.orderId.toLowerCase() === q)
    ) || null
  );
}

export function findOrder(orderId) {
  for (const customer of state.customers) {
    const order = customer.orders.find(
      (o) => o.orderId.toLowerCase() === String(orderId).toLowerCase()
    );
    if (order) return { customer, order };
  }
  return null;
}

export function applyRefundDecision(orderId, decision) {
  const found = findOrder(orderId);
  if (!found) return null;
  if (decision === "approved") {
    found.order.refunded = true;
    found.order.status = "returned";
    found.customer.refundsLast90Days += 1;
  }
  return found;
}

export function getConversation(conversationId) {
  if (!state.conversations.has(conversationId)) {
    state.conversations.set(conversationId, {
      messages: [],
      createdAt: new Date().toISOString(),
    });
  }
  return state.conversations.get(conversationId);
}

export function listConversationIds() {
  return Array.from(state.conversations.keys());
}

export function appendLog(conversationId, entry) {
  if (!state.logs.has(conversationId)) {
    state.logs.set(conversationId, []);
  }
  const log = {
    id: state.logs.get(conversationId).length + 1,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  state.logs.get(conversationId).push(log);
  return log;
}

export function getLogs(conversationId) {
  return state.logs.get(conversationId) || [];
}

export function resetStore() {
  state.customers = structuredClone(customersSeed);
  state.conversations.clear();
  state.logs.clear();
}
