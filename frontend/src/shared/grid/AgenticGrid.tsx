/** Shared domain-independent grid shell: server criteria, sortable/draggable columns, bounded pages and reviewed AI filters. */
import { extensionColumns, extensionFilterSummary } from "./extension-columns";
import ExtensionFilter from "./ExtensionFilter";
import { useLocale } from "../i18n/i18n";
import { useCoreExtensionText } from "../i18n/core-extension-i18n";
import { Fragment, useEffect, useState } from "react";
import Icon from "../ui/Icon";
import GridAgent from "./GridAgent";
import GridColumns from "./GridColumns";
import { useGridText } from "./grid-i18n";
import {
  moveColumn,
  normalizeLayout,
  readLayout,
  saveLayout,
  type GridLayout,
} from "./preferences";
import type { GridProps } from "./types";
import "./grid.css";
export default function AgenticGrid<Row>({
  id,
  title,
  columns: baseColumns,
  rows,
  rowKey,
  onRow,
  criteria,
  onCriteria,
  searchKey = "query",
  searchable = true,
  expandedRow,
  filters = [],
  loading,
  error,
  next,
  previous,
  onNext,
  onFirst,
  onRefresh,
  emptyAction,
  agent,
}: GridProps<Row>) {
  const { g } = useGridText();
  const { locale } = useLocale();
  const extensionText = useCoreExtensionText();
  const columns = [...baseColumns, ...extensionColumns(rows, locale)];
  const ids = columns.map((c) => c.id),
    hidden = columns.filter((c) => c.hidden).map((c) => c.id);
  const [saved, setSaved] = useState<GridLayout>(() =>
    readLayout(id, ids, hidden),
  );
  const layout = normalizeLayout(ids, hidden, saved);
  const visible = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id) => columns.find((c) => c.id === id)!);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dragging, setDragging] = useState("");
  useEffect(() => setSaved(readLayout(id, ids, hidden)), [id]);
  const changeLayout = (v: GridLayout) => {
    setSaved(v);
    saveLayout(id, v);
  };
  const update = (key: string, value: string) => {
    const v = { ...criteria };
    if (value === "") delete v[key];
    else v[key] = value;
    onCriteria(v);
  };
  const active = Object.entries(criteria).filter(
    ([k, v]) => !["sort", "direction"].includes(k) && v !== "",
  );
  const labels = {
    [searchKey]: g("search"),
    appFilter: extensionText("fields"),
    sort: g("sort"),
    direction: g("sort"),
    ...Object.fromEntries(filters.map((f) => [f.key, f.label])),
  };
  return (
    <section
      className={`agent-grid ${layout.compact ? "is-compact" : ""}`}
      aria-label={title}
    >
      <div className="agent-grid-toolbar">
        {searchable && (
          <label className="agent-grid-search">
            <Icon name="search" />
            <span className="sr-only">{g("search")}</span>
            <input
              type="search"
              maxLength={200}
              value={String(criteria[searchKey] ?? "")}
              placeholder={g("search")}
              onChange={(e) => update(searchKey, e.target.value)}
            />
          </label>
        )}
        <div className="agent-grid-tools">
          {agent && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("veyndo.workspace.pin", {
                    detail: { title, criteria },
                  }),
                )
              }
            >
              <Icon name="link" />
              {g("pin")}
            </button>
          )}
          {!!filters.length && (
            <button
              type="button"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Icon name="settings" />
              {g("filters")}
              {!!active.length && (
                <span className="agent-grid-count">{active.length}</span>
              )}
            </button>
          )}
          <GridColumns
            columns={columns}
            layout={layout}
            onChange={changeLayout}
            onReset={() => changeLayout(normalizeLayout(ids, hidden))}
          />
          {onRefresh && (
            <button
              type="button"
              disabled={loading}
              aria-label={g("refresh")}
              onClick={onRefresh}
            >
              <Icon name="refresh" />
            </button>
          )}
          {agent && (
            <GridAgent
              agent={agent}
              labels={labels}
              formatValue={(key, value) =>
                key === "appFilter"
                  ? extensionFilterSummary(String(value), rows, locale)
                  : undefined
              }
              values={{
                ...Object.fromEntries(
                  filters.map((f) => [
                    f.key,
                    Object.fromEntries(
                      (f.options ?? []).map((o) => [o.value, o.label]),
                    ),
                  ]),
                ),
                sort: Object.fromEntries(
                  columns.filter((c) => c.sort).map((c) => [c.sort!, c.label]),
                ),
                direction: { asc: g("ascending"), desc: g("descending") },
              }}
              onApply={onCriteria}
            />
          )}
        </div>
      </div>
      {filterOpen && (
        <div className="agent-grid-filters">
          <ExtensionFilter
            rows={rows}
            locale={locale}
            onChange={(v) => update("appFilter", v)}
          />
          {filters.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.options ? (
                <select
                  value={String(criteria[f.key] ?? "")}
                  onChange={(e) => update(f.key, e.target.value)}
                >
                  <option value="">{g("all")}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  maxLength={200}
                  value={String(criteria[f.key] ?? "")}
                  onChange={(e) => update(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      )}
      {!!active.length && (
        <div className="agent-grid-chips">
          {active.map(([k, v]) => {
            const f = filters.find((f) => f.key === k);
            return (
              <button type="button" key={k} onClick={() => update(k, "")}>
                {labels[k] ?? k}:{" "}
                {k === "appFilter"
                  ? extensionFilterSummary(String(v), rows, locale)
                  : (f?.options?.find((o) => o.value === String(v))?.label ??
                    String(v))}
                <Icon name="close" size={14} />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              onCriteria({
                sort: criteria.sort ?? "",
                direction: criteria.direction ?? "",
              })
            }
          >
            {g("clear")}
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="agent-grid-error">
          <div>
            <strong>{g("readFailure")}</strong>
            <details>
              <summary>{g("details")}</summary>
              <p>{error}</p>
            </details>
          </div>
          {onRefresh && (
            <button type="button" onClick={onRefresh}>
              {g("refresh")}
            </button>
          )}
        </div>
      )}
      <div className="agent-grid-scroll" aria-busy={loading}>
        <table className="agent-grid-table">
          <thead>
            <tr>
              {visible.map((c) => (
                <th
                  key={c.id}
                  className={c.align === "end" ? "is-end" : ""}
                  aria-sort={
                    c.sort && criteria.sort === c.sort
                      ? criteria.direction === "desc"
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  draggable
                  onDragStart={(e) => {
                    setDragging(c.id);
                    e.dataTransfer.setData("text/plain", c.id);
                  }}
                  onDragEnd={() => setDragging("")}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragging)
                      changeLayout(moveColumn(layout, dragging, c.id));
                    setDragging("");
                  }}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() =>
                        onCriteria({
                          ...criteria,
                          sort: c.sort!,
                          direction:
                            criteria.sort === c.sort &&
                            criteria.direction !== "desc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      {c.label}
                      <span aria-hidden="true">
                        {criteria.sort === c.sort
                          ? criteria.direction === "desc"
                            ? "↓"
                            : "↑"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </th>
              ))}
              {onRow && (
                <th>
                  <span className="sr-only">{g("open")}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={rowKey(row)}>
                <tr>
                  {visible.map((c) => (
                    <td
                      key={c.id}
                      className={c.align === "end" ? "is-end" : ""}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                  {onRow && (
                    <td>
                      <button
                        type="button"
                        className="agent-grid-open"
                        aria-label={g("open")}
                        onClick={() => onRow(row)}
                      >
                        <Icon name="arrow" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
                {expandedRow?.(row) && (
                  <tr>
                    <td colSpan={visible.length + (onRow ? 1 : 0)}>
                      {expandedRow(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {loading && (
          <div role="status" className="agent-grid-loading">
            <span className="agent-grid-shimmer" />
            {g("loading")}
          </div>
        )}
        {!loading && !error && !rows.length && (
          <div className="agent-grid-empty">
            <Icon name="search" size={32} />
            <h3>{g("empty")}</h3>
            <p>{g("emptyHint")}</p>
            {active.length > 0 && (
              <button
                type="button"
                className="studio-secondary"
                onClick={() => onCriteria({})}
              >
                {g("clear")}
              </button>
            )}
            {emptyAction}
          </div>
        )}
      </div>
      <footer className="agent-grid-footer">
        <span role="status">
          {loading ? g("loading") : g("count", rows.length)}
        </span>
        <div>
          {previous && (
            <button type="button" disabled={loading} onClick={onFirst}>
              {g("first")}
            </button>
          )}
          {next && (
            <button type="button" disabled={loading} onClick={onNext}>
              {g("next")}
              <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
