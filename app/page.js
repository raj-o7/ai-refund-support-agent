import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  return (
    <div>
      <p className="hint">
        Chat with the refund support agent as a customer. Try an order ID like{" "}
        <code>ORD-1001</code> (standard eligible), <code>ORD-1003</code>{" "}
        (damaged item), <code>ORD-1004</code> (digital good, non-refundable),
        <code> ORD-1006</code> (high value, escalates), or{" "}
        <code>ORD-1007</code> (fraud guard, escalates). Full customer/order
        list is in <code>data/customers.json</code>.
      </p>
      <ChatPanel />
    </div>
  );
}
