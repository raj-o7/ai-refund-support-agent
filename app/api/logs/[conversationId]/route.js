import { NextResponse } from "next/server";
import { getLogs } from "@/lib/store";

export async function GET(_req, { params }) {
  const { conversationId } = await params;
  return NextResponse.json({ logs: getLogs(conversationId) });
}
