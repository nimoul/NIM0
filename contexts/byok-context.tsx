"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Provider } from "@/lib/models";

interface ByokContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isDirectMode: boolean;
  setIsDirectMode: (enabled: boolean) => void;
  configuredProviders: Record<Provider, boolean>;
  refreshProviders: () => Promise<void>;
  getProviderForModel: (modelId: string) => Provider | null;
  hasKeyForModel: (modelId: string) => boolean;
}

const ByokContext = createContext<ByokContextType | null>(null);

export function useByok(): ByokContextType {
  const context = useContext(ByokContext);
  if (!context) {
    throw new Error("useByok must be used within a <ByokProvider />");
  }
  return context;
}

export function ByokProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState("openai/gpt-4o");
  const [isDirectMode, setIsDirectModeState] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<
    Record<Provider, boolean>
  >({
    openai: false,
    anthropic: false,
    google: false,
  });

  // Persist model selection to sessionStorage
  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    try {
      sessionStorage.setItem("byok_selected_model", model);
    } catch {
      // ignore
    }
  }, []);

  const setIsDirectMode = useCallback((enabled: boolean) => {
    setIsDirectModeState(enabled);
    try {
      sessionStorage.setItem("byok_direct_mode", enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const savedModel = sessionStorage.getItem("byok_selected_model");
      if (savedModel) setSelectedModelState(savedModel);
      const savedMode = sessionStorage.getItem("byok_direct_mode");
      if (savedMode === "1") setIsDirectModeState(true);
    } catch {
      // ignore
    }
  }, []);

  const refreshProviders = useCallback(async () => {
    try {
      const response = await fetch("/api/byok/keys");
      if (!response.ok) return;
      const data = await response.json();
      setConfiguredProviders(data.keys);
    } catch {
      // ignore
    }
  }, []);

  // Load provider status on mount
  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  const getProviderForModel = useCallback(
    (modelId: string): Provider | null => {
      const prefix = modelId.split("/")[0];
      if (prefix === "openai" || prefix === "anthropic" || prefix === "google") {
        return prefix as Provider;
      }
      return null;
    },
    [],
  );

  const hasKeyForModel = useCallback(
    (modelId: string): boolean => {
      const provider = getProviderForModel(modelId);
      if (!provider) return false;
      return configuredProviders[provider];
    },
    [configuredProviders, getProviderForModel],
  );

  const value = useMemo(
    () => ({
      selectedModel,
      setSelectedModel,
      isDirectMode,
      setIsDirectMode,
      configuredProviders,
      refreshProviders,
      getProviderForModel,
      hasKeyForModel,
    }),
    [
      selectedModel,
      setSelectedModel,
      isDirectMode,
      setIsDirectMode,
      configuredProviders,
      refreshProviders,
      getProviderForModel,
      hasKeyForModel,
    ],
  );

  return <ByokContext.Provider value={value}>{children}</ByokContext.Provider>;
}
