/** Stable grouped navigation replaces clipped horizontal tabs; a labelled selector serves narrow workspaces. */
import {
  useKnowledgeText,
  type KnowledgeWord,
} from "../../shared/i18n/knowledge-i18n";
import Icon, { type IconName } from "../../shared/ui/Icon";
const groups: { title: KnowledgeWord; items: [KnowledgeWord, IconName][] }[] = [
  {
    title: "knowledgeFoundation",
    items: [
      ["overview", "layers"],
      ["sources", "form"],
      ["explorer", "graph"],
    ],
  },
  {
    title: "knowledgeDecisions",
    items: [
      ["preview", "search"],
      ["guardrails", "lock"],
      ["observations", "check"],
      ["behavior", "chart"],
      ["experiments", "gauge"],
    ],
  },
];
export default function KnowledgeNavigation({
  tab,
  onTab,
}: {
  tab: string;
  onTab: (tab: string) => void;
}) {
  const k = useKnowledgeText();
  return (
    <nav className="knowledge-navigation" aria-label={k("knowledgeNavigate")}>
      <label className="knowledge-mobile-navigation">
        {k("knowledgeNavigate")}
        <select value={tab} onChange={(e) => onTab(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.title} label={k(g.title)}>
              {g.items.map(([item]) => (
                <option key={item} value={item}>
                  {k(item)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="knowledge-navigation-groups">
        {groups.map((g) => (
          <section key={g.title}>
            <h2>{k(g.title)}</h2>
            {g.items.map(([item, icon]) => (
              <button
                key={item}
                aria-pressed={tab === item}
                aria-current={tab === item ? "page" : undefined}
                onClick={() => onTab(item)}
              >
                <Icon name={icon} />
                <span>{k(item)}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </nav>
  );
}
