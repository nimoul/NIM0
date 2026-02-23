import { streamText } from "ai";
import { auth } from "@/app/(auth)/auth";
import {
  createChatOwnership,
  getChatCountByUserId,
  getUserByokKey,
} from "@/lib/db/queries";
import { userEntitlements } from "@/lib/entitlements";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;

// Model configurations with max output tokens
const MODEL_MAX_TOKENS: Record<string, number> = {
  // OpenAI
  "openai/gpt-4o": 16384,
  "openai/gpt-4o-mini": 16384,
  "openai/o3-mini": 65536,
  // Anthropic
  "anthropic/claude-3-7-sonnet-latest": 8192,
  "anthropic/claude-3-5-haiku-latest": 8192,
  // Google
  "google/gemini-2.5-pro": 8192,
  "google/gemini-2.5-flash": 8192,
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Rate limit check
    const chatCount = await getChatCountByUserId({
      userId: session.user.id,
      differenceInHours: 24,
    });
    if (chatCount >= userEntitlements.maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const { message, model, apiKey, provider, chatId, systemPrompt } =
      await request.json();

    if (!message || !model || !provider) {
      return Response.json(
        { error: "message, model, and provider are required" },
        { status: 400 },
      );
    }

    // Resolve API key: use provided key or fetch stored key from DB
    let resolvedKey = apiKey;
    if (!resolvedKey || resolvedKey === "__use_stored__") {
      resolvedKey = await getUserByokKey({
        userId: session.user.id,
        provider,
      });
    }

    if (!resolvedKey) {
      return Response.json(
        {
          error: `No API key configured for ${provider}. Add your key in AI Provider Keys settings.`,
        },
        { status: 428 },
      );
    }

    // Ensure model ID has provider prefix
    const modelId = model.includes("/") ? model : `${provider}/${model}`;
    const maxTokens = MODEL_MAX_TOKENS[modelId] || 8192;

    const result = streamText({
      model: modelId,
      system:
        systemPrompt ||
        "You are a helpful AI assistant. You write clean, well-structured code when asked. You explain your reasoning clearly.",
      messages: [{ role: "user", content: message }],
      maxOutputTokens: maxTokens,
      providerOptions: {
        [provider]: {
          apiKey: resolvedKey,
        },
      },
      abortSignal: request.signal,
    });

    // Record chat ownership asynchronously
    if (chatId && session.user.id) {
      createChatOwnership({
        v0ChatId: chatId,
        userId: session.user.id,
      }).catch((err) => console.error("Failed to create chat ownership:", err));
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("BYOK Chat Error:", error);
    return Response.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
