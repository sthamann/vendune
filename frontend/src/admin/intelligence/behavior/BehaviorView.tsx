/** Behavioral workspace makes consent, channel/window, guest journeys and semantic projections inspectable. */
import { useEffect, useState, useRef } from "react";
import {
  useBehaviorText,
  type BehaviorWord,
} from "../../../shared/i18n/behavior-i18n";
import { useLocale } from "../../../shared/i18n/i18n";
import type { RequestFn } from "../../shell/studio-types";
import type { BehaviorReport, Journey } from "./types";
import BehaviorGraph from "./BehaviorGraph";
import BehaviorJourney from "./BehaviorJourney";
import "../../styles/behavior.css";
export default function BehaviorView({
  request,
  onProduct,
  onEntity,
}: {
  request: RequestFn;
  onProduct: (id: string) => void;
  onEntity?: (kind: "customers" | "orders", id: string) => void;
}) {
  const k = useBehaviorText(),
    { number, date, locale } = useLocale();
  const epoch = useRef(0);
  const [days, setDays] = useState(7),
    [channel, setChannel] = useState("default"),
    [channels, setChannels] = useState<{ id: string; name: string }[]>([]),
    [revision, setRevision] = useState(0),
    [report, setReport] = useState<BehaviorReport>(),
    [journey, setJourney] = useState<Journey>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    ++epoch.current;
    setBusy(true);
    setReport(undefined);
    setJourney(undefined);
    setError(false);
    request("/api/knowledge/behavior", { days, salesChannelId: channel })
      .then((v) => {
        if (active) {
          setReport(v);
          setChannels(v.channels ?? []);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      ++epoch.current;
    };
  }, [request, days, channel, revision]);
  const inspect = async (session: string) => {
    setError(false);
    const current = ++epoch.current;
    try {
      const result = await request("/api/knowledge/behavior/journey", {
        session,
      });
      if (current === epoch.current) setJourney(result);
    } catch {
      if (current === epoch.current) setError(true);
    }
  };
  const label = (s: string) =>
    s === "unknown" ||
    s === "direct" ||
    ["mobile", "tablet", "desktop"].includes(s)
      ? k(s as BehaviorWord)
      : s;
  const country = (s: string) =>
    s === "unknown"
      ? k("unknown")
      : (new Intl.DisplayNames(locale, { type: "region" }).of(s) ?? s);
  return (
    <div className="behavior-workspace">
      <div className="behavior-toolbar">
        <p>{k("behaviorIntro")}</p>
        <label>
          {k("channel")}
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {(channels.length
              ? channels
              : [{ id: "default", name: "default" }]
            ).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          {k("days")}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>{k("day")}</option>
            <option value={7}>{k("week")}</option>
            <option value={30}>{k("month")}</option>
          </select>
        </label>
        <button
          className="studio-secondary"
          disabled={busy}
          onClick={() => setRevision((r) => r + 1)}
        >
          {k("refresh")}
        </button>
      </div>
      {error && (
        <div role="alert" className="knowledge-alert">
          {k("notAvailable")}
          <button onClick={() => setRevision((r) => r + 1)}>
            {k("retry")}
          </button>
        </div>
      )}
      {busy && <p role="status">{k("loading")}</p>}
      {report && (
        <>
          <div className="behavior-census">
            {(["contexts", "identified", "events", "ordered"] as const).map(
              (key) => (
                <div key={key}>
                  <span>{k(key)}</span>
                  <strong>{number(report.totals[key])}</strong>
                </div>
              ),
            )}
          </div>
          <p className="muted">{k("contextHint")}</p>
          {!report.totals.events ? (
            <section className="behavior-card">
              <p>{k("empty")}</p>
            </section>
          ) : (
            <>
              <div className="behavior-grid">
                <section className="behavior-card">
                  <h2>{k("funnel")}</h2>
                  {(["viewed", "added", "checkout", "ordered"] as const).map(
                    (key) => (
                      <div className="behavior-bar" key={key}>
                        <span>{k(key)}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.min(100, (100 * report.totals[key]) / Math.max(1, report.totals.contexts))}%`,
                            }}
                          />
                        </div>
                        <strong>{number(report.totals[key])}</strong>
                      </div>
                    ),
                  )}
                  <p>{k("funnelHint")}</p>
                </section>
                <section className="behavior-card">
                  <h2>{k("daily")}</h2>
                  <div className="behavior-daily">
                    {report.daily.map((day) => (
                      <div
                        key={day.day}
                        title={`${day.day} · ${k("contexts")}: ${number(day.contexts)}`}
                      >
                        <strong>{number(day.contexts)}</strong>
                        <i
                          style={{
                            height: `${20 + (100 * day.contexts) / Math.max(1, ...report.daily.map((d) => d.contexts))}px`,
                          }}
                        />
                        <time>
                          {new Intl.DateTimeFormat(locale, {
                            day: "numeric",
                            month: "short",
                            timeZone: "UTC",
                          }).format(new Date(day.day))}
                        </time>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="behavior-grid dimensions">
                {(
                  [
                    "browser",
                    "viewport",
                    "country",
                    "geoCountry",
                    "referrer",
                  ] as const
                ).map((dimension) => (
                  <section className="behavior-card" key={dimension}>
                    <h2>{k(dimension)}</h2>
                    {report.dimensions
                      .filter((d) => d.dimension === dimension)
                      .slice(0, 8)
                      .map((d) => (
                        <div className="behavior-bar" key={d.label}>
                          <span>
                            {dimension.endsWith("Country") ||
                            dimension === "country"
                              ? country(d.label)
                              : label(d.label)}
                          </span>
                          <div>
                            <i
                              style={{
                                width: `${(100 * d.contexts) / Math.max(1, report.totals.contexts)}%`,
                              }}
                            />
                          </div>
                          <strong>{number(d.contexts)}</strong>
                        </div>
                      ))}
                    {dimension === "geoCountry" && !report.geoConfigured && (
                      <p>{k("geoHint")}</p>
                    )}
                  </section>
                ))}
              </div>
              <BehaviorGraph report={report} onProduct={onProduct} />
              <section className="behavior-card">
                <h2>{k("products")}</h2>
                <div className="behavior-table">
                  <table>
                    <thead>
                      <tr>
                        {(
                          [
                            "products",
                            "views",
                            "adds",
                            "questions",
                            "contexts",
                          ] as const
                        ).map((s) => (
                          <th key={s}>{k(s)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="behavior-link"
                              onClick={() => onProduct(p.id)}
                            >
                              {p.name}
                            </button>
                          </td>
                          <td>{number(p.views)}</td>
                          <td>{number(p.adds)}</td>
                          <td>{number(p.questions)}</td>
                          <td>{number(p.contexts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="behavior-card">
                <h2>{k("journeys")}</h2>
                <p>{k("privateHint")}</p>
                {report.canInspectJourneys &&
                  report.journeys.map((j) => (
                    <button
                      className="behavior-visit"
                      key={j.session}
                      onClick={() => void inspect(j.session)}
                    >
                      <span>{k(j.identified ? "customer" : "guest")}</span>
                      <time>{date(j.last)}</time>
                      <strong>
                        {number(j.events)} · {k("events")}
                      </strong>
                      <span>{k("inspect")} →</span>
                    </button>
                  ))}
              </section>
              {journey && (
                <BehaviorJourney
                  journey={journey}
                  onClose={() => {
                    ++epoch.current;
                    setJourney(undefined);
                  }}
                  onProduct={onProduct}
                  onEntity={onEntity}
                />
              )}
            </>
          )}
          <p className="behavior-privacy">{k("retention")}</p>
        </>
      )}
    </div>
  );
}
