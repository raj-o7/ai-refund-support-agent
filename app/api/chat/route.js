import { NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";
import { getConversation } from "@/lib/store";

export async function POST(req) {
  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return NextResponse.json(
      { error: "conversationId and message are required" },
      { status: 400 }
    );
  }

  const conversation = getConversation(conversationId);

  try {
    const { reply, messages } = await runAgentTurn(
      conversationId,
      conversation.messages,
      message
    );
    conversation.messages = messages;
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
