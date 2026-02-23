"use client";

import { Bot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS, PROVIDERS, type Provider } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled,
  className,
}: ModelSelectorProps) {
  const groupedModels = (Object.keys(PROVIDERS) as Provider[]).map(
    (provider) => ({
      provider,
      label: PROVIDERS[provider].name,
      models: MODELS.filter((m) => m.provider === provider),
    }),
  );

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className} size="sm">
        <Bot className="h-3.5 w-3.5" />
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {groupedModels.map((group, index) => (
          <div key={group.provider}>
            {index > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel>{group.label}</SelectLabel>
              {group.models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
