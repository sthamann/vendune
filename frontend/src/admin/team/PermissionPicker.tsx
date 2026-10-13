/** One readable, searchable permission selector; technical IDs always remain visible beside the label. */
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
        {available
          .filter((p) =>
            `${t(p)} ${p}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
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
    </section>
  );
}
