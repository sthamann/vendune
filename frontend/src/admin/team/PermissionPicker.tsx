/** One readable, searchable permission selector; technical IDs always remain visible beside the label. */
import { usePermissionGroupText } from "./permission-groups";
import "./permission-picker.css";
import { useState } from "react";
import { usePermissionText } from "./permission-i18n";
export default function PermissionPicker({
  available,
  value,
  onChange,
  granted,
  disabled = false,
}: {
  available: string[];
  value: string[];
  onChange: (v: string[]) => void;
  granted?: string[];
  disabled?: boolean;
}) {
  const t = usePermissionText(),
    [query, setQuery] = useState("");
  const groupText = usePermissionGroupText();
  const matching = available.filter((p) =>
    `${t(p)} ${p}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const groups = [...new Set(matching.map((p) => p.split(".")[0]))];
  return (
    <section className="permission-picker">
      <label className="permission-search">
        {t("search")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="permission-grid">
        {groups.map((group) => (
          <details
            className="permission-group"
            key={group}
            open={
              !!query ||
              value.some((p) => p.startsWith(group + ".")) ||
              available.length < 8
            }
          >
            <summary>
              {groupText(group)}{" "}
              <small>
                {value.filter((p) => p.startsWith(group + ".")).length} /{" "}
                {available.filter((p) => p.startsWith(group + ".")).length}
              </small>
            </summary>
            <div>
              {matching
                .filter((p) => p.startsWith(group + "."))
                .map((p) => (
                  <label className="permission-option" key={p}>
                    <input
                      type="checkbox"
                      disabled={disabled || (!!granted && !granted.includes(p))}
                      checked={value.includes(p)}
                      onChange={(e) =>
                        onChange(
                          e.target.checked
                            ? [...value, p]
                            : value.filter((v) => v !== p),
                        )
                      }
                    />
                    <span>
                      {t(p)} <code>({p})</code>
                    </span>
                  </label>
                ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
