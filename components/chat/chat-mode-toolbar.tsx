"use client";

import { Zap } from "lucide-react";
import { useByok } from "@/contexts/byok-context";
import { cn } from "@/lib/utils";
import { ModelSelector } from "./model-selector";

interface ChatModeToolbarProps {
  disabled?: boolean;
}

export function ChatModeToolbar({ disabled }: ChatModeToolbarProps) {
  const {
    selectedModel,
    setSelectedModel,
    isDirectMode,
    setIsDirectMode,
    hasKeyForModel,
  } = useByok();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsDirectMode(!isDirectMode)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          isDirectMode
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          disabled && "cursor-not-allowed opacity-50",
        )}
        title={
          isDirectMode
            ? "Using your API key directly"
            : "Switch to direct API mode"
        }
      >
        <Zap className={cn("h-3 w-3", isDirectMode && "fill-current")} />
        {isDirectMode ? "Direct" : "v0 SDK"}
      </button>

      {isDirectMode && (
        <div className="flex items-center gap-1.5">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={disabled}
          />
          {!hasKeyForModel(selectedModel) && (
            <span className="text-xs text-destructive">No key</span>
          )}
        </div>
      )}
    </div>
  );
}
