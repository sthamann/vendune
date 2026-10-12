/** A derived graph connects coarse browsers to native products and existing semantic product relations. */
import {
  behaviorWords,
  useBehaviorText,
  type BehaviorWord,
} from "../../../shared/i18n/behavior-i18n";
import {
  knowledgeWords,
  useKnowledgeText,
  type KnowledgeWord,
} from "../../../shared/i18n/knowledge-i18n";
import type { BehaviorReport } from "./types";
export default function BehaviorGraph({
  report,
  onProduct,
}: {
  report: BehaviorReport;
  onProduct: (id: string) => void;
}) {
  const k = useBehaviorText(),
    knowledge = useKnowledgeText();
  const columns = [
    Array.from(new Set(report.graph.observations.map((e) => e.source))).slice(
      0,
      6,
    ),
    report.products.slice(0, 8).map((p) => `product:${p.id}`),
    Array.from(new Set(report.graph.semantic.map((e) => e.target))).slice(0, 8),
  ];
  const position = new Map<string, { x: number; y: number }>();
  columns.forEach((nodes, col) =>
    nodes.forEach((id, i) =>
      position.set(id, { x: col * 330 + 130, y: 65 + i * 65 }),
    ),
  );
  const height = Math.max(160, ...columns.map((c) => c.length * 65 + 70));
  const edges = [...report.graph.observations, ...report.graph.semantic];
  return (
    <section className="behavior-card">
      <h2>{k("graph")}</h2>
      <p>{k("graphHint")}</p>
      <div className="behavior-graph-scroll">
        <svg viewBox={`0 0 920 ${height}`} role="img" aria-label={k("graph")}>
          {[k("browser"), k("products"), k("intent")].map((title, i) => (
            <text
              className="behavior-graph-heading"
              key={title}
              x={i * 330 + 130}
              y={24}
              textAnchor="middle"
            >
              {title}
            </text>
          ))}
          {edges.map((edge, i) => {
            const start = position.get(edge.source),
              end = position.get(edge.target);
            return start && end ? (
              <path
                key={i}
                d={`M ${start.x + 105} ${start.y} C ${start.x + 190} ${start.y}, ${end.x - 190} ${end.y}, ${end.x - 105} ${end.y}`}
                className={
                  edge.kind === "observed"
                    ? "behavior-edge"
                    : "behavior-edge semantic"
                }
              >
                <title>
                  {edge.kind === "observed" && "count" in edge
                    ? `${k("contexts")}: ${edge.count}`
                    : k("intent")}
                </title>
              </path>
            ) : null;
          })}
          {columns.flat().map((node) => {
            const p = position.get(node)!;
            const product = report.products.find(
              (product) => node === `product:${product.id}`,
            );
            const raw = node.slice(node.indexOf(":") + 1),
              key = `need_${raw}`;
            const label =
              product?.name ??
              (node.startsWith("intent:") && key in behaviorWords
                ? k(key as BehaviorWord)
                : node.startsWith("intent:") && key in knowledgeWords
                  ? knowledge(key as KnowledgeWord)
                  : node === "browser:Other"
                    ? k("otherBrowser")
                    : raw);
            return (
              <g
                key={node}
                transform={`translate(${p.x},${p.y})`}
                role={product ? "button" : undefined}
                aria-label={product ? `${k("products")}: ${label}` : undefined}
                tabIndex={product ? 0 : undefined}
                onClick={() => product && onProduct(product.id)}
                onKeyDown={(e) =>
                  product &&
                  (e.key === "Enter" || e.key === " ") &&
                  onProduct(product.id)
                }
                className={product ? "behavior-node product" : "behavior-node"}
              >
                <rect x={-105} y={-21} width={210} height={42} rx={12} />
                <title>{label}</title>
                <text textAnchor="middle" dominantBaseline="central">
                  {label.length > 26 ? label.slice(0, 25) + "…" : label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="muted">{k("limited")}</p>
    </section>
  );
}
