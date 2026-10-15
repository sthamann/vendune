/** Channel, private save and agent entry remain visible above the shared preview. */
import Icon from "../../../../frontend/src/shared/ui/Icon";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import type { Designer } from "./useDesigner";
import { useDesignText } from "./design-i18n";
import { useEditorText } from "./editor-i18n";
import { useWorkspaceText } from "./workspace-i18n";
export default function DesignerHeader({
  d,
  rights,
  sandbox,
  writable,
  creating,
  selectionError,
  onChannel,
  onSandbox,
  onEnvironments,
  onAgent,
  agentOpen,
}: {
  d: Designer;
  rights: string[];
  sandbox: boolean;
  writable: boolean;
  creating: boolean;
  selectionError: boolean;
  onChannel: (channel: string) => void;
  onSandbox: () => void;
  onEnvironments: () => void;
  onAgent: () => void;
  agentOpen: boolean;
}) {
  const t = useDesignText(),
    e = useEditorText(),
    w = useWorkspaceText(),
    { language, mainLocale } = useContentLanguage();
  return (
    <>
      {" "}
      <header className="designer-heading">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("hint")}</p>
        </div>
        <label>
          {t("channel")}
          <select
            value={d.channel}
            onChange={(e) => {
              onChannel(e.target.value);
            }}
          >
            {d.context!.channels.map((c) => (
              <option value={c.id} key={c.id}>
                {contentText(c.data.name, language, mainLocale)}
              </option>
            ))}
            <option value="*">{t("global")}</option>
          </select>
        </label>
      </header>
      {d.error && (
        <p className="designer-error" role="alert">
          {d.error}
        </p>
      )}
      {selectionError && (
        <p className="designer-error" role="alert">
          {e("unavailable")}
        </p>
      )}
      {d.saved && <p role="status">{t("saved")}</p>}
      <div className="designer-toolbar">
        <span className={`designer-scope ${sandbox ? "is-private" : ""}`}>
          <Icon name={sandbox ? "lock" : "globe"} />
          {sandbox ? t("sandbox") : t("readOnly")}
        </span>
        {!sandbox && (
          <button
            disabled={!rights.includes("environments.manage") || creating}
            onClick={onSandbox}
          >
            {t("sandbox")} ↗
          </button>
        )}
        {d.draft && (
          <button
            className="studio-primary"
            disabled={!writable || !d.dirty || d.busy}
            onClick={() => void d.save()}
          >
            <Icon name="check" />
            {t("save")}
          </button>
        )}
        <button
          disabled={!rights.includes("environments.read")}
          onClick={onEnvironments}
        >
          {t("publish")} ↗
        </button>
        <button
          type="button"
          className="designer-agent-entry"
          aria-pressed={agentOpen}
          onClick={onAgent}
        >
          <Icon name="spark" size={17} />
          {w("agent")}
        </button>
      </div>
      <p className="designer-scope-hint">
        {d.draft && sandbox ? t("draftHint") : t("previewHint")}
      </p>
    </>
  );
}
