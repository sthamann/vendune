/** Schema-based, non-interactive design illustration. Never fetches data or executes app actions. */
import type { Block, Entity } from "../../shared/apps/native/types";
import Icon from "../../shared/ui/Icon";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { useOptionalContentLanguage } from "../../shared/i18n/ContentLanguage";
import { contentText } from "../../shared/i18n/content-language";
import { controlIcons } from "./app-visuals";
export default function AppDesignPreview({
  block: b,
  entities,
  mainLocale,
}: {
  block: Block;
  entities: Entity[];
  mainLocale: string;
}) {
  const { a, locale } = useAppStudioText();
  const scope = useOptionalContentLanguage();
  const text = (value: Block["title"]) =>
    contentText(
      value,
      scope?.language ?? locale,
      scope?.mainLocale ?? mainLocale,
    );
  const entity = entities.find((e) => e.name === b.entity);
  const fields =
    entity?.fields.filter((f) => !f.coreReference).slice(0, 3) ?? [];
  const field = entity?.fields.find((f) => f.name === b.dataField);
  const label = entity ? text(entity.label) || a("entity") : a("entity");
  const input = (caption: string, choice?: string) => (
    <div className="app-preview-field" key={caption}>
      <span>{caption}</span>
      <span className="app-preview-input">{choice ?? a("designField")}</span>
    </div>
  );
  return (
    <div className={`app-design-preview app-preview-${b.kind}`}>
      <div className="app-preview-kind">
        <Icon name={controlIcons[b.kind]} size={14} />
        {a(b.kind)}
      </div>
      <h3>{text(b.title) || a(b.kind)}</h3>
      {b.kind === "text" ? (
        <p>{text(b.text ?? {})}</p>
      ) : b.kind === "table" ? (
        <div className="app-preview-table">
          <div className="app-preview-table-head">
            {fields.map((f) => (
              <span key={f.name}>{text(f.label) || a("field")}</span>
            ))}
          </div>
          {[0, 1, 2].map((row) => (
            <div className="app-preview-table-row" key={row} aria-hidden="true">
              {fields.map((f) => (
                <i key={f.name} />
              ))}
            </div>
          ))}
        </div>
      ) : b.kind === "form" ? (
        <div className="app-preview-form">
          {fields.length ? (
            fields.map((f) =>
              input(
                text(f.label) || a("field"),
                f.choices?.[0] ? text(f.choices[0].label) : undefined,
              ),
            )
          ) : (
            <p>{a("designFields")}</p>
          )}
        </div>
      ) : b.kind === "button" ? (
        <span className="app-preview-action">
          <Icon name="check" size={15} />
          {text(b.title) || a("save")}
        </span>
      ) : ["textbox", "combobox", "datepicker"].includes(b.kind) ? (
        <div className="app-preview-input">
          {field?.choices?.[0]
            ? text(field.choices[0].label)
            : a("designField")}
          <Icon name={controlIcons[b.kind]} size={15} />
        </div>
      ) : b.kind === "checkbox" ? (
        <span className="app-preview-checkbox">
          <Icon name="checkbox" size={18} />
          {field ? text(field.label) : a("yes")}
        </span>
      ) : b.kind === "image" ? (
        <div className="app-preview-media">
          <Icon name="image" size={32} />
          {a("designImage")}
        </div>
      ) : b.kind === "chart" ? (
        <div className="app-preview-chart" aria-hidden="true">
          {[35, 60, 45, 80, 65].map((height, i) => (
            <i key={i} style={{ height: `${height}%` }} />
          ))}
        </div>
      ) : b.kind === "kpi" ? (
        <div className="app-preview-kpi" aria-hidden="true">
          —<span>↗</span>
        </div>
      ) : b.kind === "cards" ? (
        <div className="app-preview-cards" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Icon name="box" />
              <i />
              <i />
            </div>
          ))}
        </div>
      ) : (
        <div className="app-preview-area">
          <Icon name={controlIcons[b.kind]} />
          {a("designArea")}
        </div>
      )}
      {b.entity && (
        <div className="app-preview-binding">
          <Icon name="link" size={12} />
          {a("bound")} {label}
          {field && <span> · {text(field.label) || a("field")}</span>}
        </div>
      )}
    </div>
  );
}
