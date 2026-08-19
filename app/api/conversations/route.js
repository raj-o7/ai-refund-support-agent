import { NextResponse } from "next/server";
import { listConversationIds } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ conversationIds: listConversationIds() });
}
