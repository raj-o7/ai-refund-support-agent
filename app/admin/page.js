import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <div>
      <p className="hint">
        Live reasoning logs for every customer conversation — tool calls,
        tool results, and final responses, in order. Open a chat in another
        tab and watch it appear here in real time.
      </p>
      <AdminDashboard />
    </div>
  );
}
