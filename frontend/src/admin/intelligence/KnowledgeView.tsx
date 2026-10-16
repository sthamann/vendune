/** Unified knowledge workspace connects sources, product evidence, observations and no-model retrieval previews. */
import { useEffect, useState } from "react";
import {
  useKnowledgeText,
  type KnowledgeWord,
} from "../../shared/i18n/knowledge-i18n";
import { useStudioText } from "../../shared/i18n/studio-ui-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
import type { Overview, RequestFn } from "../shell/studio-types";
import type { Workspace } from "./knowledge-types";
import BehaviorView from "./behavior/BehaviorView";
import KnowledgeNavigation from "./KnowledgeNavigation";
import KnowledgeOverview from "./KnowledgeOverview";
import KnowledgeSources from "./KnowledgeSources";
import KnowledgeExplorer from "./KnowledgeExplorer";
import KnowledgePreview from "./KnowledgePreview";
import ExternalKnowledge from "./ExternalKnowledge";
import ExperimentStudio from "./ExperimentStudio";
import GuardrailSettings from "./GuardrailSettings";
import EvidenceReview from "./EvidenceReview";
import MemoryView from "./MemoryView";
import "../styles/knowledge.css";
import "../styles/knowledge-sources.css";
import "../styles/knowledge-evidence.css";
export function KnowledgeView({
  focus,
  data,
  request,
  onIntent,
  onProduct,
  onEntity,
}: {
  focus: string;
  data: Overview;
  request: RequestFn;
  onIntent: (s: string) => void;
  onProduct: (id: string) => void;
  onEntity?: (kind: "customers" | "orders", id: string) => void;
}) {
  const k = useKnowledgeText(),
    { number } = useLocale();
  const { u } = useStudioText();
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<string>();
  const selectKnowledge = (next: string) => {
    if (next === tab) return;
    if (dirty) setPending(next);
    else setTab(next);
  };
  const [tab, setTab] = useState("overview"),
    [workspace, setWorkspace] = useState<Workspace>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setWorkspace(await request("/api/knowledge/workspace"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    setBusy(true);
    request("/api/knowledge/workspace")
      .then((v) => {
        if (active) setWorkspace(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [request]);
  const newSource = () => {
    setTab("sources");
    setCreate(true);
  };
  return (
    <div className="studio-page knowledge-workspace">
      <div className="page-intro knowledge-intro">
        <div>
          <span className="kicker">{k(tab as KnowledgeWord)}</span>
          <h1>{k("heading")}</h1>
          <p>{k("intro")}</p>
        </div>
        <button
          className="studio-secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          <Icon name="refresh" />
          {k("refresh")}
        </button>
      </div>
      {pending && (
        <div className="knowledge-alert" role="alert">
          <p>{u("discardHint")}</p>
          <button
            className="studio-secondary"
            onClick={() => setPending(undefined)}
          >
            {u("keepEditing")}
          </button>
          <button
            className="studio-secondary"
            onClick={() => {
              setDirty(false);
              setTab(pending);
              setPending(undefined);
            }}
          >
            {u("discard")}
          </button>
        </div>
      )}
      <div className="knowledge-workbench">
        <KnowledgeNavigation tab={tab} onTab={selectKnowledge} />
        <div className="knowledge-workbench-content">
          {error && (
            <div className="knowledge-alert" role="alert">
              {error}
              <button
                className="studio-secondary"
                disabled={busy}
                onClick={() => void load()}
              >
                {k("retry")}
              </button>
            </div>
          )}
          {busy && !workspace && <p role="status">{k("loading")}</p>}
          {workspace && (
            <>
              {tab === "overview" && (
                <KnowledgeOverview
                  workspace={workspace}
                  onTab={setTab}
                  onCreate={newSource}
                />
              )}{" "}
              {tab === "sources" && (
                <>
                  <KnowledgeSources
                    workspace={workspace}
                    request={request}
                    onChange={() => void load()}
                    create={create}
                    onCreateDone={() => setCreate(false)}
                  />
                  <ExternalKnowledge request={request} />
                </>
              )}
              {tab === "explorer" && (
                <KnowledgeExplorer
                  focus={focus}
                  products={data.products}
                  request={request}
                  onProduct={onProduct}
                  onIntent={onIntent}
                />
              )}
              {tab === "preview" && (
                <KnowledgePreview
                  products={data.products}
                  request={request}
                  onIntent={onIntent}
                />
              )}
              {tab === "behavior" && (
                <BehaviorView
                  request={request}
                  onProduct={onProduct}
                  onEntity={onEntity}
                />
              )}
              {tab === "experiments" && <ExperimentStudio request={request} />}
              {tab === "guardrails" && (
                <GuardrailSettings
                  request={request}
                  products={data.products}
                  onDirtyChange={setDirty}
                />
              )}
              {tab === "observations" && (
                <>
                  <div className="knowledge-census">
                    {(
                      [
                        "productViews",
                        "cartAdds",
                        "reviews",
                        "processedEvents",
                      ] as const
                    ).map((field, i) => (
                      <div key={field}>
                        <span>
                          {k(
                            (
                              [
                                "views",
                                "cartAdds",
                                "reviews",
                                "processed",
                              ] as const
                            )[i],
                          )}
                        </span>
                        <strong>{number(workspace.totals[field] ?? 0)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="muted">{k("viewsHint")}</p>
                  <EvidenceReview
                    products={data.products}
                    workspace={workspace}
                    request={request}
                  />
                  <MemoryView
                    request={request}
                    products={data.products}
                    canWrite={workspace.canWrite}
                    onChange={() => void load()}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
