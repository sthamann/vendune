/** Payment/contact options sit in the scrolling tool pane; final tender and completion stay visible. */
import { useState } from "react";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
import type { PosCart } from "./pos-model";
import Icon from "../../shared/ui/Icon";
export default function RegisterCheckoutOptions({
  register: r,
}: {
  register: ReturnType<typeof useRegister>;
}) {
  const t = usePosText();
  const [contact, setContact] = useState<Record<string, string>>({});
  const c = r.cart;
  if (!c) return null;
  const select = (value: Partial<PosCart["checkout"]>) =>
    r.select({ ...c.checkout, ...value });
  return (
    <section className="pos-payment">
      <label>
        {t("payment")}
        <select
          value={c.checkout.paymentMethodId}
          disabled={r.busy}
          onChange={(e) => void select({ paymentMethodId: e.target.value })}
        >
          {r.options?.payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>
          <Icon name="people" />
          {t("contact")}
        </summary>
        <div className="pos-contact">
          {(
            ["email", "first", "last", "street", "postal", "city"] as const
          ).map((k) => (
            <label key={k}>
              {t(k)}
              <input
                type={k === "email" ? "email" : "text"}
                value={contact[k] ?? ""}
                onChange={(e) =>
                  setContact({ ...contact, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <button
            disabled={r.busy}
            onClick={() =>
              void select({
                ...(contact.email ? { customerEmail: contact.email } : {}),
                ...(contact.street
                  ? {
                      billingAddress: {
                        firstName: contact.first ?? "",
                        lastName: contact.last ?? "",
                        street: contact.street,
                        postalCode: contact.postal ?? "",
                        city: contact.city ?? "",
                        country: c.checkout.country,
                      },
                    }
                  : {}),
              })
            }
          >
            {t("save")}
          </button>
        </div>
      </details>
    </section>
  );
}
