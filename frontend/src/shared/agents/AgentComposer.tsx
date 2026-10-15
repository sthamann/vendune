/** Shared agent entry: domain adapters retain all API, model, permission and approval behavior. */
import type { ReactNode } from "react";
import Icon from "../ui/Icon";
import { useAgentText } from "./agent-i18n";
import "./agents.css";
export type AgentEngine = "platform" | "codex" | "claude_code";
export default function AgentComposer({
  prompt,
  onPrompt,
  engine,
  onEngine,
  onSubmit,
  placeholder,
  busy,
  disabled,
  children,
  maxLength = 8000,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  engine: AgentEngine;
  onEngine: (value: AgentEngine) => void;
  onSubmit: () => void;
  placeholder?: string;
  busy: boolean;
  disabled: boolean;
  children?: ReactNode;
  maxLength?: number;
}) {
  const t = useAgentText();
  return (
    <form
      className="agent-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !disabled && prompt.trim()) onSubmit();
      }}
    >
      <div
        className="agent-engine-picker"
        role="group"
        aria-label={t("engine")}
      >
        {(["platform", "codex", "claude_code"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={engine === value}
            onClick={() => onEngine(value)}
          >
            <Icon
              name={
                value === "platform"
                  ? "spark"
                  : value === "codex"
                    ? "code"
                    : "chat"
              }
              size={17}
            />
            {t(value)}
          </button>
        ))}
      </div>
      <label className="agent-prompt-label">
        {t("prompt")}
        <textarea
          aria-label={t("prompt")}
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
        />
      </label>
      {children}
      <button
        type="submit"
        className="studio-primary agent-submit"
        disabled={disabled || busy || !prompt.trim()}
      >
        <Icon name={engine === "platform" ? "spark" : "code"} size={17} />
        {t(busy ? "working" : engine === "platform" ? "generate" : "export")}
      </button>
      <small className="agent-composer-note">
        {t(engine === "platform" ? "internal" : "handoff")}
      </small>
    </form>
  );
}
