"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 1500;

function LogEntry({ log }) {
  if (log.type === "user_message") {
    return (
      <div className="log-entry user_message">
        <div className="log-meta">
          <span>#{log.id}</span>
          <span>customer message</span>
          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <pre>{log.content}</pre>
      </div>
    );
  }

  if (log.type === "tool_call") {
    return (
      <div className="log-entry tool_call">
        <div className="log-meta">
          <span>#{log.id}</span>
          <span>tool call → {log.tool}</span>
          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <pre>{JSON.stringify(log.args, null, 2)}</pre>
      </div>
    );
  }

  if (log.type === "tool_result") {
    const decision = log.result?.decision || log.result?.status;
    return (
      <div className="log-entry tool_result">
        <div className="log-meta">
          <span>#{log.id}</span>
          <span>tool result ← {log.tool}</span>
          {decision && <span className={`badge ${decision}`}>{decision}</span>}
          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <pre>{JSON.stringify(log.result, null, 2)}</pre>
      </div>
    );
  }

  if (log.type === "final_response") {
    return (
      <div className="log-entry final_response">
        <div className="log-meta">
          <span>#{log.id}</span>
          <span>agent final reply</span>
          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <pre>{log.content}</pre>
      </div>
    );
  }

  return (
    <div className="log-entry error">
      <div className="log-meta">
        <span>#{log.id}</span>
        <span>error</span>
        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
      <pre>{log.content}</pre>
    </div>
  );
}

export default function AdminDashboard() {
  const [conversationIds, setConversationIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const logPanelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function pollConversations() {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (cancelled) return;
        setConversationIds(data.conversationIds || []);
        setSelected((prev) => prev || data.conversationIds?.[0] || null);
      } catch {
        // ignore transient errors while polling
      }
    }

    pollConversations();
    const interval = setInterval(pollConversations, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    async function pollLogs() {
      try {
        const res = await fetch(`/api/logs/${encodeURIComponent(selected)}`);
        const data = await res.json();
        if (!cancelled) setLogs(data.logs || []);
      } catch {
        // ignore transient errors while polling
      }
    }

    pollLogs();
    const interval = setInterval(pollLogs, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected]);

  useEffect(() => {
    logPanelRef.current?.scrollTo({ top: logPanelRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="admin-layout">
      <div className="conv-list">
        {conversationIds.length === 0 && (
          <div className="log-meta">No conversations yet.</div>
        )}
        {conversationIds.map((id) => (
          <button
            key={id}
            className={`conv-list-item ${id === selected ? "active" : ""}`}
            onClick={() => setSelected(id)}
          >
            {id.slice(0, 18)}…
          </button>
        ))}
      </div>

      <div className="log-panel" ref={logPanelRef}>
        {logs.length === 0 && (
          <div className="log-meta">
            No reasoning logs yet for this conversation.
          </div>
        )}
        {logs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
