/** Merchant AI boundaries use canonical settings revisions, native catalogue lookup and the shared assistant. */
import { useEffect, useState } from "react";
import type { RequestFn, Product } from "../shell/studio-types";
import { useSettingsDraft } from "../settings/useSettingsDraft";
import { useKnowledgeText } from "../../shared/i18n/knowledge-i18n";
import { useStudio } from "../shell/StudioContext";
import Icon from "../../shared/ui/Icon";
import GuardrailProductSearch from "./GuardrailProductSearch";
import GuardrailProductCard from "./GuardrailProductCard";
import {
  defaultPolicy,
  validPolicy,
  type Policy,
  type Settings,
} from "./guardrail-model";
import "../styles/guardrails.css";
export default function GuardrailSettings(props: {
  request: RequestFn;
  products: Product[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { access } = useStudio(),
    k = useKnowledgeText();
  return access.includes("settings.read") ||
    access.includes("settings.write") ? (
    <GuardrailEditor {...props} />
  ) : (
    <p className="knowledge-boundary">{k("policyNoAccess")}</p>
  );
}
function GuardrailEditor({
  request,
  products,
  onDirtyChange,
}: {
  request: RequestFn;
  products: Product[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const k = useKnowledgeText(),
    studio = useStudio();
  const state = useSettingsDraft<Settings>(request, "/api/merchant/commerce");
  const [added, setAdded] = useState<Product[]>([]);
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    onDirtyChange?.(state.dirty);
  }, [state.dirty, onDirtyChange]);
  const policy = state.value?.data.aiPolicy ?? defaultPolicy;
  const editable = studio.access.includes("settings.write");
  const catalogAccess = studio.access.includes("catalog.read");
  const invalid = !!state.value && !validPolicy(policy, state.value.data);
  const update = (next: Policy) => {
    if (state.value) state.change({ ...state.value.data, aiPolicy: next });
  };
  const add = (p: Product) => {
    const settings = state.value?.data;
    if (
      !settings ||
      policy.corridors.some((r) => r.productId === p.id) ||
      policy.corridors.length >= 1000
    )
      return;
    const currency =
      p.extra?.priceCurrency ?? settings.currencies?.pricingCurrency;
    const scale = settings.currencies?.definitions.find(
      (c) => c.code === currency,
    )?.scale;
    if (!currency || scale === undefined) return;
    const price = Math.round(p.price * 10 ** scale);
    setAdded((old) => [...old.filter((r) => r.id !== p.id), p]);
    update({
      ...policy,
      corridors: [
        ...policy.corridors,
        {
          productId: p.id,
          currency,
          minimumMinor: price,
          maximumMinor: price,
          minimumMarginBps: 0,
          requireAvailable: true,
        },
      ],
    });
  };
  const navigate = (tab: Parameters<typeof studio.selectTab>[0]) =>
    studio.selectTab(tab);
  const disabledLink = state.dirty || state.busy;
  return (
    <div className="guardrail-workspace">
      <header className="guardrail-heading">
        <span className="guardrail-product-icon">
          <Icon name="lock" />
        </span>
        <div>
          <h2>{k("policyTitle")}</h2>
          <p>{k("policyIntro")}</p>
        </div>
        {state.value && (
          <span className="knowledge-badge">
            {k("policyRevision")} {state.value.revision}
          </span>
        )}
      </header>
      <p className="guardrail-scope">
        <Icon name={studio.environment ? "lock" : "globe"} />
        {k(studio.environment ? "policySandbox" : "policyLive")}
      </p>
      {state.error && (
        <p role="alert" className="knowledge-alert">
          {state.error}
        </p>
      )}
      {!state.value && !state.error && <p role="status">{k("loading")}</p>}
      {state.value && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editable && !invalid) void state.save();
          }}
        >
          {!editable && (
            <p className="knowledge-boundary">{k("policyReadOnly")}</p>
          )}
          <fieldset
            className="guardrail-mode"
            disabled={!editable || state.busy}
          >
            <legend>{k("policyMode")}</legend>
            <div className="guardrail-mode-options">
              {[false, true].map((enabled) => (
                <label
                  key={String(enabled)}
                  data-selected={policy.autonomy.enabled === enabled}
                >
                  <input
                    type="radio"
                    name="guardrail-mode"
                    checked={policy.autonomy.enabled === enabled}
                    onChange={() =>
                      update({
                        ...policy,
                        autonomy: { ...policy.autonomy, enabled },
                      })
                    }
                  />
                  <span>
                    <strong>
                      {k(enabled ? "policyAuto" : "policyManual")}
                    </strong>
                    <small>
                      {k(enabled ? "policyAutoHint" : "policyManualHint")}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            {policy.autonomy.enabled && (
              <div className="guardrail-fields guardrail-budget">
                <label>
                  {k("dailyProducts")}
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={policy.autonomy.productsPerDay}
                    onChange={(e) =>
                      update({
                        ...policy,
                        autonomy: {
                          ...policy.autonomy,
                          productsPerDay: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  {k("policyChange")}
                  <input
                    type="number"
                    required
                    min={0}
                    max={5}
                    step={0.01}
                    value={policy.autonomy.maxChangeBps / 100}
                    onChange={(e) =>
                      update({
                        ...policy,
                        autonomy: {
                          ...policy.autonomy,
                          maxChangeBps: Math.round(
                            Number(e.target.value) * 100,
                          ),
                        },
                      })
                    }
                  />
                  <small>{k("policyChangeHint")}</small>
                </label>
              </div>
            )}
          </fieldset>
          <div className="guardrail-section-title">
            <h3>{k("policyProducts")}</h3>
            <span>{policy.corridors.length}</span>
          </div>
          {!policy.corridors.length && (
            <div className="guardrail-empty">
              <Icon name="box" />
              <strong>{k("policyEmpty")}</strong>
              <p>{k("policyEmptyHint")}</p>
            </div>
          )}
          {policy.corridors.slice(0, limit).map((row, index) => (
            <GuardrailProductCard
              key={row.productId}
              row={row}
              product={[...added, ...products].find(
                (p) => p.id === row.productId,
              )}
              settings={state.value!.data}
              request={request}
              catalogAccess={catalogAccess}
              navigationDisabled={disabledLink}
              disabled={!editable || state.busy}
              onChange={(patch) =>
                update({
                  ...policy,
                  corridors: policy.corridors.map((r, i) =>
                    i === index ? { ...r, ...patch } : r,
                  ),
                })
              }
              onRemove={() =>
                update({
                  ...policy,
                  corridors: policy.corridors.filter((_, i) => i !== index),
                })
              }
              onOpen={
                catalogAccess
                  ? () => {
                      if (!disabledLink)
                        studio.openEntity("productData", row.productId);
                    }
                  : undefined
              }
            />
          ))}
          {policy.corridors.length > limit && (
            <button
              type="button"
              className="studio-secondary"
              onClick={() => setLimit((n) => n + 20)}
            >
              {k("policyMore")}
            </button>
          )}
          {catalogAccess ? (
            <GuardrailProductSearch
              request={request}
              products={products}
              selected={policy.corridors.map((r) => r.productId)}
              disabled={
                !editable || state.busy || policy.corridors.length >= 1000
              }
              onAdd={add}
            />
          ) : (
            <p>{k("policyCatalogAccess")}</p>
          )}
          {invalid && (
            <p className="knowledge-alert" role="alert">
              {k("policyInvalid")}
            </p>
          )}
          <footer className="guardrail-save">
            <span role="status">
              {k(state.dirty ? "policyDraft" : "policySaved")}
            </span>
            <button
              className="studio-primary"
              disabled={!editable || !state.dirty || state.busy || invalid}
            >
              <Icon name="check" />
              {k("saveGuardrails")}
            </button>
          </footer>
          {state.saved && <p role="status">{k("guardrailsSaved")}</p>}
        </form>
      )}
      <aside className="guardrail-connected">
        <h3>{k("policyConnected")}</h3>
        <p>{k("policyScope")}</p>
        {state.dirty && <p role="status">{k("policySaveFirst")}</p>}
        <div>
          {studio.access.includes("assistant.use") && (
            <button
              className="studio-secondary"
              disabled={disabledLink || !state.value}
              onClick={() => {
                if (policy.corridors[0])
                  studio.onProduct(policy.corridors[0].productId);
                studio.intent(
                  k("policyAgentPrompt") +
                    policy.corridors
                      .slice(0, 12)
                      .map((r) => r.productId)
                      .join(", "),
                );
              }}
            >
              <Icon name="spark" />
              {k("policyAgent")}
            </button>
          )}
          {studio.access.includes("automation.read") && (
            <button
              className="studio-secondary"
              disabled={disabledLink}
              onClick={() => navigate("automation")}
            >
              <Icon name="graph" />
              {k("policyRules")}
            </button>
          )}
          {studio.access.includes("settings.read") && (
            <button
              className="studio-secondary"
              disabled={disabledLink}
              onClick={() => navigate("commerce")}
            >
              <Icon name="settings" />
              {k("policySettings")}
            </button>
          )}
          {studio.environment &&
            studio.access.includes("environments.read") && (
              <button
                className="studio-secondary"
                disabled={disabledLink}
                onClick={() => navigate("environments")}
              >
                <Icon name="history" />
                {k("policyPublish")}
              </button>
            )}
        </div>
      </aside>
    </div>
  );
}
