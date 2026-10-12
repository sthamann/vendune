/** OS-installed receipt printers receive the issued immutable invoice projection; no USB access, credentials or duplicate ledger. */
import { useState } from "react";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
export default function ReceiptPrinter({
  register: r,
  receipt,
}: {
  register: ReturnType<typeof useRegister>;
  receipt: { id: string; number: string };
}) {
  const t = usePosText();
  const [width, setWidth] = useState("80");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const print = async () => {
    // Open synchronously during the user gesture, before authenticated I/O; never pass tokens in a print URL.
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) {
      setError(t("popupBlocked"));
      return;
    }
    popup.opener = null;
    popup.document.title = receipt.number;
    popup.document.body.textContent = t("busy");
    setBusy(true);
    setError("");
    try {
      const v = await r.command("receipt", {
        orderId: r.order!.id,
        receiptId: receipt.id,
      });
      const page = popup.document;
      const style = page.createElement("style");
      style.textContent = `@page{size:${width}mm auto;margin:3mm}body{font:12px/1.5 monospace;color:#111;background:white;margin:0;max-width:${Number(width) - 6}mm}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 4px}h1{font-size:15px}@media screen{body{margin:16px}}`;
      page.head.append(style);
      page.body.replaceChildren();
      const heading = page.createElement("h1");
      heading.textContent = v.number;
      page.body.append(heading);
      for (const line of v.lines as string[]) {
        const p = page.createElement("p");
        p.textContent = line || "\u00a0";
        page.body.append(p);
      }
      popup.focus();
      popup.print();
    } catch (e) {
      popup.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pos-printer">
      <h3>
        <Icon name="form" />
        {t("printer")}
      </h3>
      <p>{t("printHint")}</p>
      <label>
        {t("paper")}
        <select value={width} onChange={(e) => setWidth(e.target.value)}>
          <option value="58">{t("paper58")}</option>
          <option value="80">{t("paper80")}</option>
        </select>
      </label>
      <button disabled={busy} onClick={() => void print()}>
        <Icon name="form" />
        {t(busy ? "busy" : "printReceipt")}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
