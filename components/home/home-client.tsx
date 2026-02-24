"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearPromptFromStorage,
  createImageAttachment,
  createImageAttachmentFromStored,
  type ImageAttachment,
  loadPromptFromStorage,
  PromptInput,
  PromptInputImageButton,
  PromptInputImagePreview,
  PromptInputMicButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  savePromptToStorage,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { PreviewPanel } from "@/components/chat/preview-panel";
import { AppHeader } from "@/components/shared/app-header";
import { ResizableLayout } from "@/components/shared/resizable-layout";
import { useChat } from "@/hooks/use-chat";

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler({ onReset }: { onReset: () => void }) {
  const searchParams = useSearchParams();

  // Reset UI when reset parameter is present
  useEffect(() => {
    const reset = searchParams.get("reset");
    if (reset === "true") {
      onReset();

      // Remove the reset parameter from URL without triggering navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("reset");
      window.history.replaceState({}, "", newUrl.pathname);
    }
  }, [searchParams, onReset]);

  return null;
}

export function HomeClient() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  const handleReset = useCallback(() => {
    setShowChatInterface(false);
    setInputValue("");
    setAttachments([]);
    setIsFullscreen(false);
    setRefreshKey((prev) => prev + 1);
    setMessages([]);

    clearPromptFromStorage();

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  }, [setMessages]);

  // Auto-focus the textarea on page load and restore from sessionStorage
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    const storedData = loadPromptFromStorage();
    if (storedData) {
      setInputValue(storedData.message);
      if (storedData.attachments.length > 0) {
        const restoredAttachments = storedData.attachments.map(
          createImageAttachmentFromStored,
        );
        setAttachments(restoredAttachments);
      }
    }
  }, []);

  // Save prompt data to sessionStorage whenever message or attachments change
  useEffect(() => {
    if (inputValue.trim() || attachments.length > 0) {
      savePromptToStorage(inputValue, attachments);
    } else {
      clearPromptFromStorage();
    }
  }, [inputValue, attachments]);

  // Image attachment handlers
  const handleImageFiles = async (files: File[]) => {
    try {
      const newAttachments = await Promise.all(
        files.map((file) => createImageAttachment(file)),
      );
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      console.error("Error processing image files:", error);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleDragOver = () => setIsDragOver(true);
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = () => setIsDragOver(false);

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (sessionStatus !== "authenticated") {
      router.push("/login?callbackUrl=/");
      return;
    }

    const userMessage = inputValue.trim();
    clearPromptFromStorage();
    setInputValue("");
    setAttachments([]);
    setShowChatInterface(true);

    sendMessage({ text: userMessage });
  };

  const handleChatSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    sendMessage({ text: userMessage });
  };

  if (showChatInterface) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-black">
        <Suspense fallback={null}>
          <SearchParamsHandler onReset={handleReset} />
        </Suspense>

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
                onSubmit={handleChatSendMessage}
                isLoading={isLoading}
                showSuggestions={false}
              />
            </>
          }
          rightPanel={
            <PreviewPanel
              currentChat={null}
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-black">
      <Suspense fallback={null}>
        <SearchParamsHandler onReset={handleReset} />
      </Suspense>

      <AppHeader />

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-bold text-4xl text-gray-900 dark:text-white">
              What can we build together?
            </h2>
          </div>

          {/* Prompt Input */}
          <div className="mx-auto max-w-2xl">
            <PromptInput
              onSubmit={handleSendMessage}
              className="relative w-full"
              onImageDrop={handleImageFiles}
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PromptInputImagePreview
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />
              <PromptInputTextarea
                ref={textareaRef}
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}
                placeholder="Describe what you want to build..."
                className="min-h-20 text-base"
                disabled={isLoading}
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputImageButton
                    onImageSelect={handleImageFiles}
                    disabled={isLoading}
                  />
                </PromptInputTools>
                <PromptInputTools>
                  <PromptInputMicButton
                    onTranscript={(transcript) => {
                      setInputValue(
                        (prev) => prev + (prev ? " " : "") + transcript,
                      );
                    }}
                    onError={(error) => {
                      console.error("Speech recognition error:", error);
                    }}
                    disabled={isLoading}
                  />
                  <PromptInputSubmit
                    disabled={!inputValue.trim() || isLoading}
                    status={isLoading ? "streaming" : "ready"}
                  />
                </PromptInputTools>
              </PromptInputToolbar>
            </PromptInput>
          </div>

          {/* Suggestions */}
          <div className="mx-auto mt-4 max-w-2xl">
            <Suggestions>
              <Suggestion
                onClick={() => {
                  setInputValue("Landing page");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Landing page"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Todo app");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Todo app"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Dashboard");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Dashboard"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Blog");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Blog"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("E-commerce");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="E-commerce"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Portfolio");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Portfolio"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Chat app");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Chat app"
              />
              <Suggestion
                onClick={() => {
                  setInputValue("Calculator");
                  setTimeout(() => {
                    const form = textareaRef.current?.form;
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                suggestion="Calculator"
              />
            </Suggestions>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-muted-foreground text-sm">
            <p>
              Powered by{" "}
              <Link
                href="https://sdk.vercel.ai"
                className="text-foreground hover:underline"
              >
                Vercel AI SDK
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
