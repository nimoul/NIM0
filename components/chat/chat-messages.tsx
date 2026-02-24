import type { UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message } from "@/components/ai-elements/message";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div>
            {/* Empty conversation - messages will appear here when they load */}
          </div>
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((msg) => (
          <Message from={msg.role} key={msg.id}>
            {msg.parts.map((part, partIndex) => {
              if (part.type === "text") {
                return (
                  <div
                    key={`${msg.id}-${partIndex}`}
                    className="prose prose-gray dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed dark:text-gray-200"
                  >
                    {part.text}
                  </div>
                );
              }
              return null;
            })}
          </Message>
        ))}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader size={16} className="text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </ConversationContent>
    </Conversation>
  );
}
