import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getUserByokKeys,
  setUserByokKey,
  clearUserByokKey,
} from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const keys = await getUserByokKeys({ userId: session.user.id });
    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Failed to get BYOK keys:", error);
    return NextResponse.json(
      { error: "Failed to retrieve API keys" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "provider and apiKey are required" },
        { status: 400 },
      );
    }

    const validProviders = ["openai", "anthropic", "google"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider: ${provider}` },
        { status: 400 },
      );
    }

    await setUserByokKey({
      userId: session.user.id,
      provider,
      apiKey: apiKey.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save BYOK key:", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { provider } = await request.json();

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 },
      );
    }

    await clearUserByokKey({ userId: session.user.id, provider });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete BYOK key:", error);
    return NextResponse.json(
      { error: "Failed to remove API key" },
      { status: 500 },
    );
  }
}
