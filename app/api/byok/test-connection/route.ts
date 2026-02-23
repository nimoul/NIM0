import { generateText } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export const maxDuration = 30;

const PROVIDER_PREFIXES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { provider, apiKey, model } = await request.json();

    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { error: "provider, apiKey, and model are required" },
        { status: 400 },
      );
    }

    const prefix = PROVIDER_PREFIXES[provider];
    if (!prefix) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 },
      );
    }

    // Use AI SDK with the user-provided key via provider options
    const modelId = model.startsWith(`${prefix}/`)
      ? model
      : `${prefix}/${model}`;

    const result = await generateText({
      model: modelId,
      prompt: "Say 'ok'",
      maxOutputTokens: 5,
      providerOptions: {
        [provider]: {
          apiKey,
        },
      },
    });

    return NextResponse.json({
      success: true,
      response: result.text?.slice(0, 50) || "Connected successfully",
    });
  } catch (error) {
    console.error("Connection test failed:", error);

    const message =
      error instanceof Error ? error.message : "Connection test failed";

    // Detect common auth errors
    const isAuthError =
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("authentication") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("401") ||
      message.toLowerCase().includes("403");

    return NextResponse.json(
      {
        success: false,
        error: isAuthError
          ? "Invalid API key. Please check your key and try again."
          : `Connection failed: ${message}`,
      },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
