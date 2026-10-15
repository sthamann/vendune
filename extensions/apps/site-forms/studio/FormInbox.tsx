/** Private response cards use the authorized app action; answer values never become public page content. */
import { useState } from "react";
import type { FormInboxProps } from "../../../../frontend/src/shared/apps/form-contract";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useFormText } from "../storefront/form-i18n";
import "./inbox.css";
type Response = {
  id: string;
  revision: number;
  block: string;
  answers: Record<string, string | number | boolean>;
};
export default function FormInbox({
  request,
  pageId,
  labels,
  mainLocale,
}: FormInboxProps) {
  const t = useFormText(),
    { locale } = useLocale(),
    [rows, setRows] = useState<Response[]>([]),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  return (
    <details
      className="site-form-inbox"
      key={pageId}
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        setRows([]);
        setError("");
        setLoaded(false);
        void request("/api/apps/site_forms/actions/responses", {
          limit: 20,
          filter: { page: pageId },
        })
          .then((value) => {
            setRows(value.elements);
            setLoaded(true);
          })
          .catch((e) => setError(e.message));
      }}
    >
      <summary>{t("responses")}</summary>
      <p>{t("privateInbox")}</p>
      {error && <p role="alert">{error}</p>}
      {loaded && !rows.length && <p>{t("emptyInbox")}</p>}
      {rows.map((row) => (
        <article key={row.id}>
          <small>{row.id}</small>
          <dl>
            {Object.entries(row.answers).map(([id, value]) => (
              <div key={id}>
                <dt>
                  {contentText(
                    labels[`${row.block}:${id}`] ?? {},
                    locale,
                    mainLocale,
                  ) || id}
                </dt>
                <dd>
                  {typeof value === "boolean"
                    ? t(value ? "yes" : "no")
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </details>
  );
}
