/** Explicit delegation limits; empty or invalid fields never create unbounded agent authority. */
import { useAgentControlText } from "./agent-control-i18n";
export function planningScope(scope: string) {
  return (
    scope.endsWith(".read") ||
    ["assistant.use", "customers.pii"].includes(scope)
  );
}
export type BudgetFields = {
  provider: string;
  model: string;
  tokens: string;
  cost: string;
  tariff: string;
};
export function agentBudget(value: BudgetFields) {
  const micros = (text: string) => {
    const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(text);
    return match ? Number(match[1] + (match[2] ?? "").padEnd(6, "0")) : NaN;
  };
  const tokens = Number(value.tokens),
    costMicros = micros(value.cost),
    pricePerMillionMicros = micros(value.tariff);
  return ["openai", "anthropic", "ollama"].includes(value.provider) &&
    value.model.trim() !== "" &&
    value.model.length <= 128 &&
    [tokens, costMicros, pricePerMillionMicros].every(
      (n) => Number.isSafeInteger(n) && n >= 1 && n <= 1_000_000_000_000,
    )
    ? {
        provider: value.provider,
        model: value.model.trim(),
        tokens,
        costMicros,
        pricePerMillionMicros,
      }
    : null;
}
export default function AgentBudgetFields({
  value,
  onChange,
}: {
  value: BudgetFields;
  onChange: (value: BudgetFields) => void;
}) {
  const t = useAgentControlText();
  return (
    <div>
      <p>{t("budgetHint")}</p>
      <div className="api-key-fields">
        <label>
          {t("provider")}
          <select
            required
            value={value.provider}
            onChange={(e) => onChange({ ...value, provider: e.target.value })}
          >
            <option value="">{t("choose")}</option>
            <option value="openai">{t("openai")}</option>
            <option value="anthropic">{t("anthropic")}</option>
            <option value="ollama">{t("ollama")}</option>
          </select>
        </label>
        <label>
          {t("model")}
          <input
            required
            maxLength={128}
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
          />
        </label>
        {(["tokens", "cost", "tariff"] as const).map((key) => (
          <label key={key}>
            {t(key)}
            <input
              required
              type="number"
              min={key === "tokens" ? 1 : 0.000001}
              step={key === "tokens" ? 1 : 0.000001}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
