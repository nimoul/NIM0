"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  clearPromptFromStorage,
  type ImageAttachment,
} from "@/components/ai-elements/prompt-input";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { PreviewPanel } from "@/components/chat/preview-panel";
import { AppHeader } from "@/components/shared/app-header";
import { ResizableLayout } from "@/components/shared/resizable-layout";
import { useChat } from "@/hooks/use-chat";
import { useEventListener } from "@/hooks/use-event-listner";
import { cn } from "@/lib/utils";

export function ChatDetailClient() {
  const params = useParams();
  const chatId = params.chatId as string;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  // Wrapper function to handle form submit
  const handleSubmitWithAttachments = (
    e: React.FormEvent<HTMLFormElement>,
    _attachmentUrls?: Array<{ url: string }>,
  ) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    clearPromptFromStorage();
    setAttachments([]);

    sendMessage({ text: inputValue });
    setInputValue("");
  };

  // Handle fullscreen keyboard shortcuts
  useEventListener<Window, "keydown">("keydown", (event) => {
    if (event.key === "Escape" && isFullscreen) {
      setIsFullscreen(false);
    }
  });

  // Auto-focus the textarea on page load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50 dark:bg-black",
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      <AppHeader />

      <ResizableLayout
        className="h-[calc(100vh-64px)]"
        leftPanel={
          <>
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
            />

            <ChatInput
              message={inputValue}
              setMessage={setInputValue}
              onSubmit={handleSubmitWithAttachments}
              isLoading={isLoading}
              showSuggestions={false}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              textareaRef={textareaRef}
            />
          </>
        }
        rightPanel={
          <PreviewPanel
            currentChat={{ id: chatId }}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            refreshKey={refreshKey}
            setRefreshKey={setRefreshKey}
          />
        }
      />
    </div>
  );
}
