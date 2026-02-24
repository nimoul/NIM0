export const maxDuration = 60;

import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { getChatCountByUserId } from "@/lib/db/queries";
import { userEntitlements } from "@/lib/entitlements";
import { ChatSDKError } from "@/lib/errors";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chatCount = await getChatCountByUserId({
    userId: session.user.id,
    differenceInHours: 24,
  });

  if (chatCount >= userEntitlements.maxMessagesPerDay) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    system:
      "You are a helpful AI assistant. You can help with a wide range of tasks including coding, writing, analysis, math, and general knowledge. When working on complex tasks, think step by step.",
    messages: await convertToModelMessages(messages),
    maxSteps: 20,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
