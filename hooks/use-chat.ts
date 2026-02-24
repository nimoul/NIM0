import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

/**
 * Custom hook wrapping the AI SDK useChat with project defaults.
 *
 * Provides:
 * - DefaultChatTransport pointing at /api/chat
 * - maxSteps: 20 for multi-step tool calling chains
 */
export function useChat() {
  const chat = useAIChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    maxSteps: 20,
  });

  return chat;
}
