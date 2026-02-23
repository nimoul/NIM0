"use client";

import {
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Settings2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type Provider, PROVIDERS, getDefaultTestModel } from "@/lib/models";
import { cn } from "@/lib/utils";

type TestStatus = "idle" | "testing" | "success" | "error";

interface ProviderKeyState {
  key: string;
  hasExisting: boolean;
  testStatus: TestStatus;
  testMessage: string;
  showKey: boolean;
  isSaving: boolean;
}

const defaultProviderState: ProviderKeyState = {
  key: "",
  hasExisting: false,
  testStatus: "idle",
  testMessage: "",
  showKey: false,
  isSaving: false,
};

interface ByokSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ByokSettingsModal({
  open,
  onOpenChange,
}: ByokSettingsModalProps) {
  const [providers, setProviders] = useState<Record<Provider, ProviderKeyState>>(
    {
      openai: { ...defaultProviderState },
      anthropic: { ...defaultProviderState },
      google: { ...defaultProviderState },
    },
  );

  // Load existing key status on open
  useEffect(() => {
    if (!open) return;

    const loadKeys = async () => {
      try {
        const response = await fetch("/api/byok/keys");
        if (!response.ok) return;
        const data = await response.json();
        const keys = data.keys as Record<Provider, boolean>;

        setProviders((prev) => ({
          openai: { ...prev.openai, hasExisting: keys.openai ?? false },
          anthropic: {
            ...prev.anthropic,
            hasExisting: keys.anthropic ?? false,
          },
          google: { ...prev.google, hasExisting: keys.google ?? false },
        }));
      } catch (err) {
        console.error("Failed to load BYOK keys:", err);
      }
    };

    loadKeys();
  }, [open]);

  const updateProvider = useCallback(
    (provider: Provider, updates: Partial<ProviderKeyState>) => {
      setProviders((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], ...updates },
      }));
    },
    [],
  );

  const handleTestConnection = useCallback(
    async (provider: Provider) => {
      const state = providers[provider];
      const keyToTest = state.key.trim();

      if (!keyToTest && !state.hasExisting) {
        updateProvider(provider, {
          testStatus: "error",
          testMessage: "Enter an API key first",
        });
        return;
      }

      updateProvider(provider, { testStatus: "testing", testMessage: "" });

      try {
        // If user entered a new key, save it first, then test
        if (keyToTest) {
          const saveRes = await fetch("/api/byok/keys", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider, apiKey: keyToTest }),
          });
          if (!saveRes.ok) {
            throw new Error("Failed to save key");
          }
          updateProvider(provider, { hasExisting: true });
        }

        const testModel = getDefaultTestModel(provider);
        const response = await fetch("/api/byok/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey: keyToTest || "__use_stored__",
            model: testModel,
          }),
        });

        const data = await response.json();
        if (data.success) {
          updateProvider(provider, {
            testStatus: "success",
            testMessage: "Connected successfully",
            key: "",
          });
        } else {
          updateProvider(provider, {
            testStatus: "error",
            testMessage: data.error || "Connection failed",
          });
        }
      } catch (err) {
        updateProvider(provider, {
          testStatus: "error",
          testMessage:
            err instanceof Error ? err.message : "Connection test failed",
        });
      }
    },
    [providers, updateProvider],
  );

  const handleSaveKey = useCallback(
    async (provider: Provider) => {
      const state = providers[provider];
      const keyToSave = state.key.trim();
      if (!keyToSave) return;

      updateProvider(provider, { isSaving: true });

      try {
        const response = await fetch("/api/byok/keys", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey: keyToSave }),
        });

        if (!response.ok) {
          throw new Error("Failed to save key");
        }

        updateProvider(provider, {
          hasExisting: true,
          key: "",
          isSaving: false,
          testStatus: "idle",
          testMessage: "",
        });
      } catch (err) {
        updateProvider(provider, {
          isSaving: false,
          testStatus: "error",
          testMessage:
            err instanceof Error ? err.message : "Failed to save key",
        });
      }
    },
    [providers, updateProvider],
  );

  const handleRemoveKey = useCallback(
    async (provider: Provider) => {
      try {
        const response = await fetch("/api/byok/keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove key");
        }

        updateProvider(provider, {
          hasExisting: false,
          key: "",
          testStatus: "idle",
          testMessage: "",
        });
      } catch (err) {
        console.error("Failed to remove key:", err);
      }
    },
    [updateProvider],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            API Key Settings
          </DialogTitle>
          <DialogDescription>
            Add your own API keys to use models from OpenAI, Anthropic, and
            Google directly. Keys are encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {(Object.keys(PROVIDERS) as Provider[]).map((provider) => {
            const config = PROVIDERS[provider];
            const state = providers[provider];

            return (
              <div
                key={provider}
                className="rounded-lg border border-border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground text-sm">
                      {config.name}
                    </h3>
                    {state.hasExisting && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 text-xs dark:text-emerald-400">
                        Configured
                      </span>
                    )}
                  </div>
                  <a
                    href={config.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                  >
                    Get key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={state.showKey ? "text" : "password"}
                      value={state.key}
                      onChange={(e) =>
                        updateProvider(provider, {
                          key: e.target.value,
                          testStatus: "idle",
                          testMessage: "",
                        })
                      }
                      placeholder={
                        state.hasExisting
                          ? "Enter new key to replace..."
                          : config.keyPlaceholder
                      }
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateProvider(provider, { showKey: !state.showKey })
                      }
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={state.showKey ? "Hide key" : "Show key"}
                    >
                      {state.showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveKey(provider)}
                    disabled={!state.key.trim() || state.isSaving}
                    className="shrink-0"
                  >
                    {state.isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant={
                      state.testStatus === "success"
                        ? "outline"
                        : state.testStatus === "error"
                          ? "outline"
                          : "secondary"
                    }
                    onClick={() => handleTestConnection(provider)}
                    disabled={
                      state.testStatus === "testing" ||
                      (!state.key.trim() && !state.hasExisting)
                    }
                    className={cn(
                      "shrink-0",
                      state.testStatus === "success" &&
                        "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                      state.testStatus === "error" &&
                        "border-destructive/30 text-destructive",
                    )}
                  >
                    {state.testStatus === "testing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : state.testStatus === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : state.testStatus === "error" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>

                {/* Status message */}
                {state.testMessage && (
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      state.testStatus === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {state.testMessage}
                  </p>
                )}

                {/* Remove key button */}
                {state.hasExisting && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey(provider)}
                    className="mt-2 text-muted-foreground text-xs transition-colors hover:text-destructive"
                  >
                    Remove key
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
