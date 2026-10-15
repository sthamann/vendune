/** Coding agents receive the current Manifest IR and authoritative schema; imported edits round-trip to the canvas. */
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import AppProposalReview from "./AppProposalReview";
import { useControlText } from "../../shared/i18n/control-i18n";
import { useState } from "react";
import AgentComposer, {
  type AgentEngine,
} from "../../shared/agents/AgentComposer";
import AgentTaskTransfer from "../../shared/agents/AgentTaskTransfer";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import type { RequestFn } from "../shell/studio-types";
import type { Manifest } from "../../shared/apps/native/types";
import type { AppStudio } from "./useAppStudio";
import { compile } from "./app-model";
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const el = document.createElement("a");
  el.href = url;
  el.download = name;
  el.click();
  URL.revokeObjectURL(url);
}
export default function AppAgentPanel({
  studio,
  request,
}: {
  studio: AppStudio;
  request: RequestFn;
}) {
  const c = useControlText(),
    t = useBuildingText();
  const { a } = useAppStudioText(),
    { w } = useWorkbenchText();
  const [prompt, setPrompt] = useState(""),
    [provider, setProvider] = useState("platform"),
    [model, setModel] = useState(""),
    [agent, setAgent] = useState<AgentEngine>("platform"),
    [task, setTask] = useState(""),
    [json, setJson] = useState("");
  const configured = studio.providers.find(
    (p) => p.id === provider,
  )?.configured;
  return (
    <div className="app-agent-panel">
      <section className="app-model-card">
        <h2>{a("prompt")}</h2>
        <p>{a("hint")}</p>
        <div className="app-agent-options">
          <button
            type="button"
            className="studio-secondary"
            onClick={() => setPrompt(t("formPrompt"))}
          >
            {t("formIdea")}
          </button>
          <button
            type="button"
            className="studio-secondary"
            onClick={() => setPrompt(t("validationPrompt"))}
          >
            {t("validationIdea")}
          </button>
        </div>
        <AgentComposer
          prompt={prompt}
          onPrompt={setPrompt}
          engine={agent}
          onEngine={setAgent}
          busy={studio.busy}
          disabled={!studio.env || (agent === "platform" && !configured)}
          placeholder={w("promptExample")}
          onSubmit={() =>
            void studio.run(async () => {
              if (agent === "platform")
                await studio.generate(
                  prompt,
                  provider,
                  model ||
                    studio.providers.find((p) => p.id === provider)?.model ||
                    "",
                );
              else
                setTask(
                  JSON.stringify(
                    await request("/api/developer/task", {
                      environment: studio.env,
                      prompt,
                      agent,
                      manifest: studio.manifest,
                    }),
                    null,
                    2,
                  ),
                );
            })
          }
        >
          {agent === "platform" && (
            <div className="app-agent-options">
              <label>
                {w("provider")}
                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value);
                    setModel("");
                  }}
                >
                  {studio.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id === "platform" ? c("platformDefault") : p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {w("model")}
                <input
                  value={
                    model ||
                    studio.providers.find((p) => p.id === provider)?.model ||
                    ""
                  }
                  onChange={(event) => setModel(event.target.value)}
                  maxLength={128}
                />
              </label>
            </div>
          )}
          {agent === "platform" && !configured && (
            <small>{w("providerMissing")}</small>
          )}
        </AgentComposer>
      </section>
      <AppProposalReview studio={studio} />
      {task && (
        <AgentTaskTransfer
          task={JSON.parse(task)}
          name={`${studio.manifest.id}-agent-task.json`}
          busy={studio.busy}
          onImport={async (value) => {
            const parsed = value as { manifest?: Manifest };
            const m = (parsed.manifest ?? parsed) as Manifest;
            if (
              !m ||
              !["declarative", "service"].includes(m.runtime) ||
              !Array.isArray(m.entities) ||
              !Array.isArray(m.views) ||
              !Array.isArray(m.surfaces)
            )
              throw Error(a("invalid"));
            await studio.run(() => studio.proposeImport(compile(m)));
          }}
        />
      )}
      <div className="app-agent-options">
        <button
          className="studio-secondary"
          disabled={studio.busy}
          onClick={() =>
            void studio.run(async () =>
              downloadJson(
                "app-studio-schema.json",
                await request("/api/developer/schema"),
              ),
            )
          }
        >
          {a("schema")}
        </button>
        <button
          className="studio-secondary"
          onClick={() =>
            downloadJson(`${studio.manifest.id}.json`, studio.manifest)
          }
        >
          {a("download")}
        </button>
      </div>
      <section className="app-model-card">
        <h2>{a("import")}</h2>
        <textarea
          aria-label={w("contract")}
          rows={10}
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <button
          className="studio-primary"
          disabled={!json || !studio.env || studio.busy}
          onClick={() => {
            try {
              const parsed = JSON.parse(json),
                m = (parsed.manifest ?? parsed) as Manifest;
              if (
                !m ||
                !["declarative", "service"].includes(m.runtime) ||
                !Array.isArray(m.entities) ||
                !Array.isArray(m.views) ||
                !Array.isArray(m.surfaces)
              )
                throw Error(a("invalid"));
              void studio.run(() => studio.proposeImport(compile(m)));
              studio.setError("");
            } catch (e) {
              studio.setError((e as Error).message);
            }
          }}
        >
          {a("import")}
        </button>
      </section>
    </div>
  );
}
