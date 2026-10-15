/** Whole-page and section restoration use retained native app revisions; restoration is an editable draft. */
import { useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Page, PageFields } from "../model";
import { useEditorText } from "./editor-i18n";
type Version = {
  revision: number;
  fields: PageFields;
  actor: string | null;
  source: string;
  createdAt: string;
};
export default function PageHistory({
  request,
  page,
  selected,
  disabled,
  onRestore,
}: {
  request: RequestFn;
  page: Page;
  selected: string;
  disabled: boolean;
  onRestore: (page: Page) => void;
}) {
  const t = useEditorText(),
    [rows, setRows] = useState<Version[]>([]),
    [error, setError] = useState("");
  return (
    <details
      className="designer-history"
      key={page.id}
      onToggle={(event) => {
        if (!event.currentTarget.open || !page.revision) return;
        setError("");
        void request(
          `/api/apps/site_builder/entities/pages/${encodeURIComponent(page.id)}/history`,
        )
          .then((v) => setRows(v.versions))
          .catch((e) => setError(e.message));
      }}
    >
      <summary>{t("history")}</summary>
      {error && <p role="alert">{error}</p>}
      {rows.map((v) => (
        <article key={v.revision}>
          <strong>{v.revision}</strong>
          <small>
            {v.createdAt} · {v.actor ?? v.source}
          </small>
          <button
            disabled={disabled}
            onClick={() => onRestore({ ...page, ...v.fields, status: "draft" })}
          >
            {t("restore")}
          </button>
          {selected &&
            v.fields.content.blocks.some((b) => b.id === selected) && (
              <button
                disabled={disabled}
                onClick={() => {
                  const old = v.fields.content.blocks.find(
                    (b) => b.id === selected,
                  )!;
                  onRestore({
                    ...page,
                    content: {
                      blocks: page.content.blocks.map((b) =>
                        b.id === selected ? old : b,
                      ),
                    },
                  });
                }}
              >
                {t("restoreSection")}
              </button>
            )}
          <details>
            <summary>{t("before")}</summary>
            <pre>{JSON.stringify(v.fields, null, 2)}</pre>
          </details>
        </article>
      ))}
    </details>
  );
}
