/** In-register advice reuses the existing grounded merchant assistant; no task apply or money mutation is exposed. */
import { useState } from "react";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
export default function RegisterAssistant({
  register: r,
  onClose,
}: {
  register: ReturnType<typeof useRegister>;
  onClose: () => void;
}) {
  const t = usePosText();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ask = async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const items =
        r.cart?.lineItems.map((i) => `${i.quantity} × ${i.label}`).join("; ") ??
        "";
      const v = await r.advice(
        `${t("assistantInstruction")}${items.slice(0, 1000)}. ${question}`,
      );
      const message = [...v.messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (message?.data?.error) throw new Error(message.content);
      setAnswer(message?.content ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pos-assistant" aria-label={t("assistantTitle")}>
      <header>
        <span>
          <Icon name="spark" />
          <strong>{t("assistantTitle")}</strong>
        </span>
        <button aria-label={t("close")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <p>{t("assistantHint")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label>
          {t("assistantQuestion")}
          <textarea
            value={question}
            maxLength={1500}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <button className="pos-pay" disabled={busy || !question.trim()}>
          <Icon name="spark" />
          {t(busy ? "thinking" : "ask")}
        </button>
      </form>
      {answer && (
        <p className="pos-assistant-answer" role="status">
          {answer}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
