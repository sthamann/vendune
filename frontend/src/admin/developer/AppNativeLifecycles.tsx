/** Visual native lifecycle contract editor; execution remains in native order/RFQ owners and accepted snapshots. */
import { useState } from "react";
import type { Manifest, NativeLifecycle } from "../../shared/apps/native/types";
import {
  useLifecycleText,
  lifecycleWords,
} from "../../shared/i18n/native-lifecycle-i18n";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { contentText } from "../../shared/i18n/content-language";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { useWorkflowStateText } from "../../shared/i18n/workflow-state-text";
import PermissionPicker from "../team/PermissionPicker";
import { permissionScopes } from "../team/permission-i18n";
import { nextId, textMap } from "./app-model";
export default function AppNativeLifecycles({
  manifest,
  onChange,
}: {
  manifest: Manifest;
  onChange: (m: Manifest) => void;
}) {
  const t = useLifecycleText(),
    { language, mainLocale } = useContentLanguage(),
    nativeState = useWorkflowStateText();
  const [object, setObject] = useState<"order" | "quote">("order");
  const contracts = manifest.lifecycles ?? [];
  const set = (next: NativeLifecycle[]) =>
    onChange({
      ...manifest,
      lifecycles: next,
      permissions: next.length
        ? [...new Set([...manifest.permissions, "commerce.lifecycle"])]
        : manifest.permissions.filter((p) => p !== "commerce.lifecycle"),
    });
  const patch = (value: NativeLifecycle) =>
    set(contracts.map((c) => (c.object === value.object ? value : c)));
  const words = (key: keyof typeof lifecycleWords) =>
    Object.fromEntries(
      ["en-GB", "de-DE", "fr-FR", "es-ES"].map((l, i) => [
        l,
        lifecycleWords[key][i],
      ]),
    );
  return (
    <section className="app-model-card">
      <h2>{t("title")}</h2>
      <p>{t("hint")}</p>
      <div className="app-section-top">
        <select
          aria-label={t("title")}
          value={object}
          onChange={(e) => setObject(e.target.value as typeof object)}
        >
          {["order", "quote"].map((k) => (
            <option key={k} value={k}>
              {t(k as "order" | "quote")}
            </option>
          ))}
        </select>
        <button
          disabled={contracts.some((c) => c.object === object)}
          onClick={() => {
            const initial = object === "order" ? "in_progress" : "requested";
            set([
              ...contracts,
              {
                version: 1,
                object,
                states: [{ id: "review", label: words("state") }],
                transitions: [
                  {
                    id: "review",
                    from: initial,
                    to: "review",
                    ...(object === "order" ? { replaces: "complete" } : {}),
                    label: words("state"),
                  },
                  {
                    id: "continue",
                    from: "review",
                    to: object === "order" ? "completed" : initial,
                    label: words("transition"),
                  },
                  ...(object === "order"
                    ? [
                        {
                          id: "cancel",
                          from: "review",
                          to: "cancelled",
                          label: words("cancel"),
                        },
                      ]
                    : []),
                ],
              },
            ]);
          }}
        >
          {t("add")}
        </button>
      </div>
      {contracts.map((c) => {
        const builtins =
          c.object === "order"
            ? ["placed", "in_progress", "completed", "cancelled"]
            : ["requested", "rejected"];
        const choices = [...builtins, ...c.states.map((s) => s.id)];
        const label = (id: string) =>
          contentText(
            c.states.find((s) => s.id === id)?.label ?? {},
            language,
            mainLocale,
          ) || nativeState(c.object, id);
        const updateEdge = (
          i: number,
          delta: Partial<NativeLifecycle["transitions"][number]>,
        ) =>
          patch({
            ...c,
            transitions: c.transitions.map((e, n) =>
              n === i ? { ...e, ...delta } : e,
            ),
          });
        return (
          <article className="app-workflow-editor" key={c.object}>
            <header className="app-section-top">
              <h3>{t(c.object)}</h3>
              <button onClick={() => set(contracts.filter((v) => v !== c))}>
                {t("remove")}
              </button>
            </header>
            <div className="app-workflow-edges">
              {c.transitions.map((e) => (
                <span key={e.id}>
                  {label(e.from)} → {label(e.to)}
                </span>
              ))}
            </div>
            {c.states.map((state, i) => (
              <div className="app-connection-row" key={i}>
                <label>
                  {t("id")}
                  <input
                    maxLength={16}
                    value={state.id}
                    onChange={(e) => {
                      const id = e.target.value;
                      patch({
                        ...c,
                        states: c.states.map((s, n) =>
                          n === i ? { ...s, id } : s,
                        ),
                        transitions: c.transitions.map((e) => ({
                          ...e,
                          from: e.from === state.id ? id : e.from,
                          to: e.to === state.id ? id : e.to,
                        })),
                      });
                    }}
                  />
                </label>
                <LocalizedField
                  label={t("state")}
                  value={state.label}
                  onChange={(v) =>
                    patch({
                      ...c,
                      states: c.states.map((s, n) =>
                        n === i ? { ...s, label: textMap(v) } : s,
                      ),
                    })
                  }
                />
                <button
                  onClick={() =>
                    patch({
                      ...c,
                      states: c.states.filter((s) => s !== state),
                      transitions: c.transitions.filter(
                        (e) => e.from !== state.id && e.to !== state.id,
                      ),
                    })
                  }
                >
                  {t("remove")}
                </button>
              </div>
            ))}
            <button
              disabled={c.states.length >= 8}
              onClick={() =>
                patch({
                  ...c,
                  states: [
                    ...c.states,
                    {
                      id: nextId(
                        "step",
                        c.states.map((s) => s.id),
                      ),
                      label: words("state"),
                    },
                  ],
                })
              }
            >
              {t("addState")}
            </button>
            {c.transitions.map((edge, i) => (
              <details className="app-model-card" key={i}>
                <summary>
                  {label(edge.from)} → {label(edge.to)}
                </summary>
                <LocalizedField
                  label={t("caption")}
                  value={edge.label}
                  onChange={(v) => updateEdge(i, { label: textMap(v) })}
                />
                <div className="app-connection-row">
                  {(["from", "to"] as const).map((k) => (
                    <label key={k}>
                      {t(k)}
                      <select
                        value={edge[k]}
                        onChange={(e) => updateEdge(i, { [k]: e.target.value })}
                      >
                        {choices.map((s) => (
                          <option key={s} value={s}>
                            {label(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {c.object === "order" && (
                  <label>
                    {t("replace")}
                    <select
                      value={edge.replaces ?? ""}
                      onChange={(e) =>
                        updateEdge(i, { replaces: e.target.value || undefined })
                      }
                    >
                      <option value="">{t("keep")}</option>
                      {["start", "complete"].map((k) => (
                        <option key={k} value={k}>
                          {t(k as "start" | "complete")}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <fieldset>
                  <legend>{t("permissions")}</legend>
                  <PermissionPicker
                    available={permissionScopes}
                    value={edge.requiredPermissions ?? []}
                    onChange={(v) => updateEdge(i, { requiredPermissions: v })}
                  />
                </fieldset>
                {(c.object === "order"
                  ? ["payment.ready", "delivery.delivered"]
                  : ["quote.message"]
                ).map((g) => (
                  <label className="app-check" key={g}>
                    <input
                      type="checkbox"
                      checked={edge.guards?.includes(g) ?? false}
                      onChange={(e) =>
                        updateEdge(i, {
                          guards: e.target.checked
                            ? [...(edge.guards ?? []), g]
                            : edge.guards?.filter((v) => v !== g),
                        })
                      }
                    />
                    {t(g as "payment.ready")}
                  </label>
                ))}
                <button
                  onClick={() =>
                    patch({
                      ...c,
                      transitions: c.transitions.filter((_, n) => n !== i),
                    })
                  }
                >
                  {t("remove")}
                </button>
              </details>
            ))}
            <button
              disabled={c.transitions.length >= 24 || choices.length < 2}
              onClick={() =>
                patch({
                  ...c,
                  transitions: [
                    ...c.transitions,
                    {
                      id: nextId(
                        "edge",
                        c.transitions.map((e) => e.id),
                      ),
                      from: choices[0],
                      to: c.states[0]?.id ?? choices[1],
                      label: words("transition"),
                    },
                  ],
                })
              }
            >
              {t("addTransition")}
            </button>
          </article>
        );
      })}
    </section>
  );
}
