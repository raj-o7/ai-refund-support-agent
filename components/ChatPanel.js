"use client";

import { useEffect, useRef, useState } from "react";

const QUICK_ORDERS = [
  "ORD-1001 — standard, eligible",
  "ORD-1002 — past 30-day window",
  "ORD-1003 — damaged item",
  "ORD-1004 — digital good",
  "ORD-1006 — high value ($649)",
  "ORD-1007 — fraud guard (3 refunds)",
];

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatPanel() {
  const [conversationId] = useState(makeId);
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Connected to support. Tell me your name/email or order ID and how I can help.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return;

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function toggleRecording() {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((prev) => [...prev, { role: "agent", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="quick-orders">
        {QUICK_ORDERS.map((label) => {
          const orderId = label.split(" ")[0];
          return (
            <button
              key={orderId}
              onClick={() => sendMessage(`I'd like a refund for ${orderId}.`)}
              disabled={sending}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="chat-shell">
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {sending && <div className="msg agent">Thinking…</div>}
        </div>

        <form
          className="chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          {voiceSupported && (
            <button
              type="button"
              className={`mic ${recording ? "recording" : ""}`}
              onClick={toggleRecording}
              title="Voice input"
            >
              🎤
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={sending}
          />
          <button type="submit" className="primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
