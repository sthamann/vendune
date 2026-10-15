/** Personal entry point on the existing shell; requests and linked views retain current scope and rights. */
import { openPinnedView } from "../../shared/grid/pinned-view";
import { useEffect, useRef, useState } from "react";
import { useStudio } from "../shell/StudioContext";
import type { Tab } from "../shell/navigation";
import { canOpenStudio } from "../shell/permissions";
import Icon from "../../shared/ui/Icon";
import { useWorkspaceText } from "./workspace-i18n";
import {
  newArea,
  moveCard,
  suggestedPreset,
  presets,
  type Preset,
  type Workspace,
  type WorkspaceRecord,
} from "./workspace-model";
import WorkspaceGoals from "./WorkspaceGoals";
import "./workspace.css";
export default function PersonalWorkspace() {
  const {
    liveRequest: request,
    access,
    nav,
    tabLabel,
    selectTab,
    workspace,
    data,
    setDraft,
  } = useStudio();
  const t = useWorkspaceText();
  const [record, setRecord] = useState<WorkspaceRecord>(),
    [draft, setLayout] = useState<Workspace>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [name, setName] = useState(""),
    [preset, setPreset] = useState<Preset>(suggestedPreset(access));
  const dragging = useRef<number | null>(null),
    scope = useRef(0);
  const load = async () => {
    const generation = ++scope.current;
    setError("");
    try {
      const value = (await request("/api/studio/workspace")) as WorkspaceRecord;
      if (generation !== scope.current) return;
      setRecord(value);
      setLayout(
        value.data.areas.length
          ? value.data
          : (() => {
              const a = newArea(t(preset), preset, access);
              return { ...value.data, areas: [a], active: a.id };
            })(),
      );
    } catch {
      if (generation === scope.current) setError(t("error"));
    }
  };
  useEffect(() => {
    void load();
    return () => {
      scope.current++;
    };
  }, [workspace, request]);
  const update = (next: Workspace) => {
    setLayout(next);
    setSaved(false);
  };
  const save = async () => {
    if (!draft || !record || busy) return false;
    setBusy(true);
    setError("");
    try {
      const next = (await request(
        "/api/studio/workspace",
        { revision: record.revision, data: draft },
        "PUT",
      )) as WorkspaceRecord;
      setRecord({
        ...next,
        versions: [
          { ...record, createdAt: new Date().toISOString() },
          ...(record.versions ?? []),
        ].slice(0, 20),
      });
      setSaved(true);
      return true;
    } catch {
      setError(t("error"));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const area = draft?.areas.find((a) => a.id === draft.active);
  const patchArea = (patch: Partial<NonNullable<typeof area>>) => {
    if (draft && area)
      update({
        ...draft,
        areas: draft.areas.map((a) =>
          a.id === area.id ? { ...a, ...patch } : a,
        ),
      });
  };
  const open = async (tab: Tab) => {
    if (canOpenStudio(tab, access) && (await save())) selectTab(tab);
  };
  if (!draft || !area)
    return (
      <section className="personal-workspace">
        <p role={error ? "alert" : "status"}>{error || t("loading")}</p>
        {error && <button onClick={() => void load()}>{t("reload")}</button>}
      </section>
    );
  const cards = area.cards.filter(
    (tab) => nav.some((n) => n.id === tab) && canOpenStudio(tab, access),
  );
  return (
    <div className="personal-workspace">
      <header className="personal-heading">
        <div>
          <p className="section-label">{t("title")}</p>
          <h1>{t("lead")}</h1>
          <p>{t("hint")}</p>
        </div>
        <button
          className="studio-primary"
          disabled={busy || !record}
          onClick={() => void save()}
        >
          <Icon name="check" />
          {t("save")}
        </button>
      </header>
      {error && (
        <p role="alert">
          {error} <button onClick={() => void load()}>{t("reload")}</button>
        </p>
      )}
      {saved && <p role="status">{t("saved")}</p>}
      <div className="personal-areas" role="tablist" aria-label={t("title")}>
        {draft.areas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === area.id}
            onClick={() => update({ ...draft, active: a.id })}
          >
            {a.name}
          </button>
        ))}
      </div>
      <WorkspaceGoals
        goals={draft.goals}
        onChange={(goals) => update({ ...draft, goals })}
        onAgent={(title) => {
          setDraft(title);
          open("assistant");
        }}
        request={request}
        rights={access}
        onOpen={open}
      />
      <section className="personal-cards" aria-label={area.name}>
        {cards.map((tab, i) => (
          <article
            key={tab}
            draggable
            onDragStart={() => {
              dragging.current = i;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging.current !== null)
                patchArea({ cards: moveCard(cards, dragging.current, i) });
              dragging.current = null;
            }}
          >
            <button className="personal-card-open" onClick={() => open(tab)}>
              <Icon name={nav.find((n) => n.id === tab)!.icon} size={26} />
              <h2>{tabLabel(tab)}</h2>
              <Icon name="arrow" size={18} />
            </button>
            {tab === "overview" && data && (
              <p>
                {data.summary.ordersToday} · {tabLabel("orders")}
              </p>
            )}
            <div className="personal-card-controls">
              <button
                aria-label={`${t("up")}: ${tabLabel(tab)}`}
                disabled={!i}
                onClick={() => patchArea({ cards: moveCard(cards, i, i - 1) })}
              >
                ↑
              </button>
              <button
                aria-label={`${t("down")}: ${tabLabel(tab)}`}
                disabled={i === cards.length - 1}
                onClick={() => patchArea({ cards: moveCard(cards, i, i + 1) })}
              >
                ↓
              </button>
              <button
                aria-label={`${t("pin")}: ${tabLabel(tab)}`}
                disabled={area.pins.length >= 20}
                onClick={() =>
                  patchArea({
                    pins: [
                      ...area.pins,
                      { title: tabLabel(tab), tab, query: "" },
                    ],
                  })
                }
              >
                <Icon name="link" size={16} />
              </button>
              <button
                aria-label={`${t("remove")}: ${tabLabel(tab)}`}
                onClick={() =>
                  patchArea({ cards: area.cards.filter((c) => c !== tab) })
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
      <label className="personal-add">
        {t("add")}
        <select
          disabled={area.cards.length >= 16}
          value=""
          onChange={(e) =>
            patchArea({ cards: [...area.cards, e.target.value as Tab] })
          }
        >
          <option value="">{t("add")}</option>
          {nav
            .filter(
              (n) =>
                !["workspace", ...area.cards].includes(n.id) &&
                canOpenStudio(n.id, access),
            )
            .map((n) => (
              <option value={n.id} key={n.id}>
                {tabLabel(n.id)}
              </option>
            ))}
        </select>
      </label>
      {area.pins.length > 0 && (
        <section>
          <h2>{t("pins")}</h2>
          <div className="personal-pins">
            {area.pins
              .filter(
                (p) =>
                  nav.some((n) => n.id === p.tab) &&
                  canOpenStudio(p.tab, access),
              )
              .map((p, i) => (
                <span key={`${p.tab}_${i}`}>
                  <button
                    onClick={() => {
                      try {
                        openPinnedView(p.tab, p.query);
                        void open(p.tab);
                      } catch {
                        setError(t("error"));
                      }
                    }}
                  >
                    {p.title} ↗
                  </button>
                  <button
                    aria-label={`${t("remove")}: ${p.title}`}
                    onClick={() =>
                      patchArea({ pins: area.pins.filter((_, k) => k !== i) })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        </section>
      )}
      <details className="studio-card">
        <summary>{t("create")}</summary>
        <div className="personal-create">
          <label>
            {t("areaName")}
            <input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            {t("preset")}
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
            >
              {Object.keys(presets).map((p) => (
                <option key={p} value={p}>
                  {t(p as Preset)}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!name.trim() || draft.areas.length >= 8}
            onClick={() => {
              const a = newArea(name.trim(), preset, access);
              update({ ...draft, areas: [...draft.areas, a], active: a.id });
              setName("");
            }}
          >
            {t("create")}
          </button>
          <button
            onClick={() =>
              patchArea({
                cards: newArea(area.name, suggestedPreset(access), access)
                  .cards,
              })
            }
          >
            {t("suggest")}
          </button>
        </div>
      </details>
      <details className="studio-card">
        <summary>{t("history")}</summary>
        {record?.versions?.map((v) => (
          <p key={v.revision}>
            {v.createdAt} · {v.revision}{" "}
            <button onClick={() => update(v.data)}>{t("restore")}</button>
          </p>
        ))}
      </details>
    </div>
  );
}
