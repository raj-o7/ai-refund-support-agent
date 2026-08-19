import fs from "node:fs";
import path from "node:path";
import Groq from "groq-sdk";
import { toolSchemas, executeTool } from "@/lib/tools";
import { appendLog } from "@/lib/store";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_TOOL_ITERATIONS = 8;

const refundPolicy = fs.readFileSync(
  path.join(process.cwd(), "data", "refund-policy.md"),
  "utf-8"
);

const SYSTEM_PROMPT = `You are an AI customer support agent for an e-commerce store, handling refund requests.

Rules you must follow:
- Never approve, deny, or decide a refund from memory or intuition. Always call check_refund_eligibility and act on its result.
- Always look up the customer and the specific order before evaluating anything.
- Be concise, empathetic, and clear about *why* a decision was made — cite the policy reason.
- If the eligibility check says "escalate", call escalate_to_human and tell the customer a human will follow up. Do not attempt to approve or deny it yourself.
- If you cannot find the customer or order, ask the customer to double check their order ID or email instead of guessing.

${refundPolicy}`;

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  return new Groq({ apiKey });
}

/**
 * Runs the agent loop for one user turn: sends the conversation to the
 * model, executes any tool calls the model requests, feeds results back,
 * and repeats until the model produces a final text reply. Every step is
 * written to the per-conversation log so the admin dashboard can show
 * live reasoning.
 */
export async function runAgentTurn(conversationId, history, userMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  appendLog(conversationId, { type: "user_message", content: userMessage });

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    let completion;
    try {
      const client = getClient();
      completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: toolSchemas,
        tool_choice: "auto",
        temperature: 0.2,
      });
    } catch (err) {
      appendLog(conversationId, {
        type: "error",
        content: `LLM call failed: ${err.message}`,
      });
      throw err;
    }

    const choice = completion.choices[0];
    const message = choice.message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      appendLog(conversationId, {
        type: "final_response",
        content: message.content,
      });
      return { reply: message.content, messages: messages.slice(1) };
    }

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      appendLog(conversationId, {
        type: "tool_call",
        tool: toolCall.function.name,
        args,
      });

      let result;
      try {
        result = executeTool(toolCall.function.name, args);
      } catch (err) {
        result = { error: err.message };
      }

      appendLog(conversationId, {
        type: "tool_result",
        tool: toolCall.function.name,
        result,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  appendLog(conversationId, {
    type: "error",
    content: `Stopped after ${MAX_TOOL_ITERATIONS} tool iterations without a final answer.`,
  });
  return {
    reply:
      "Sorry, I'm having trouble completing this request right now. A human agent will follow up shortly.",
    messages: messages.slice(1),
  };
}
