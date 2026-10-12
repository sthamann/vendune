/** Owned/shared order lists use one content-language editor, native cart CAS and shared deletion confirmation. */
import { useState } from "react";
import type { Cart } from "../../shared/api/shop-api";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import LocalizedField from "../../shared/i18n/LocalizedField";
import {
  contentText,
  type LocalizedText,
} from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
export type OrderList = {
  id: string;
  revision: number;
  ownerId: string;
  data: {
    name: Record<string, string>;
    shared: boolean;
    items: { id: string; quantity: number }[];
  };
};
export default function CompanyLists({
  lists,
  cart,
  unit,
  customerId,
  busy,
  run,
  command,
  reload,
  onCart,
  mainLocale,
  locales,
}: {
  lists: OrderList[];
  cart?: Cart;
  unit: string;
  customerId: string;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  command: <T>(op: string, v: unknown) => Promise<T>;
  reload: () => Promise<void>;
  onCart: (c: Cart) => void;
  mainLocale: string;
  locales: string[];
}) {
  const t = useB2BText(),
    { locale } = useLocale(),
    [name, setName] = useState<LocalizedText>({}),
    [shared, setShared] = useState(false),
    [removing, setRemoving] = useState<OrderList>();
  return (
    <section>
      <h3>{t("lists")}</h3>
      {cart?.b2b?.unitId === unit && (
        <ContentLanguage locales={locales} mainLocale={mainLocale}>
          <article>
            <ContentLanguagePicker />
            <LocalizedField
              label={t("blankList")}
              value={name}
              onChange={setName}
              maxLength={200}
              required
            />
            <label className="b2b-toggle">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
              />
              {t("shared")}
            </label>
            <button
              disabled={
                busy || !name[mainLocale]?.trim() || !cart.lineItems.length
              }
              onClick={() =>
                void run(async () => {
                  await command("list.save", {
                    id: crypto.randomUUID().replaceAll("-", ""),
                    unitId: unit,
                    revision: 0,
                    data: {
                      name,
                      shared,
                      items: cart.lineItems.map((i) => ({
                        id: i.id,
                        quantity: i.quantity,
                      })),
                    },
                  });
                  setName({});
                  await reload();
                })
              }
            >
              {t("saveList")}
            </button>
          </article>
        </ContentLanguage>
      )}
      {lists.map((l) => (
        <article key={l.id}>
          <strong>{contentText(l.data.name, locale, mainLocale)}</strong>
          <span>
            {l.data.items.length} · {t("lists")}
          </span>
          <nav>
            <button
              disabled={busy || cart?.b2b?.unitId !== unit}
              onClick={() =>
                void run(async () => {
                  onCart(
                    await command<Cart>("list.apply", {
                      id: l.id,
                      unitId: unit,
                      revision: l.revision,
                      cartRevision: cart?.revision,
                    }),
                  );
                })
              }
            >
              {t("apply")}
            </button>
            {l.ownerId === customerId && (
              <button disabled={busy} onClick={() => setRemoving(l)}>
                {t("remove")}
              </button>
            )}
          </nav>
        </article>
      ))}
      {removing && (
        <ConfirmDialog
          title={t("remove")}
          confirmLabel={t("remove")}
          disabled={busy}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() =>
            void run(async () => {
              await command("list.delete", {
                id: removing.id,
                unitId: unit,
                revision: removing.revision,
              });
              setRemoving(undefined);
              await reload();
            })
          }
        >
          <p>{t("deleteListHint")}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
