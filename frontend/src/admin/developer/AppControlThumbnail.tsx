/** Lightweight control illustrations communicate structure; no sample data or runtime is executed. */
import type { Block } from "../../shared/apps/native/types";
export default function AppControlThumbnail({ kind }: { kind: Block["kind"] }) {
  return (
    <svg
      className={`app-control-art art-${kind}`}
      viewBox="0 0 88 56"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="86" height="54" rx="8" className="art-surface" />
      {["table", "cards"].includes(kind) ? (
        <>
          {[0, 1, 2].map((n) => (
            <g key={n}>
              <rect
                x={8 + n * 25}
                y="10"
                width="21"
                height={kind === "cards" ? "23" : "8"}
                rx="3"
              />
              <path d={`M ${8 + n * 25} 39 h 17 M ${8 + n * 25} 45 h 11`} />
            </g>
          ))}
        </>
      ) : kind === "form" || kind === "frame" ? (
        <>
          <path d="M 9 10 h 30" />
          <rect x="8" y="17" width="72" height="9" rx="3" />
          <rect x="8" y="31" width="72" height="9" rx="3" />
          <rect x="8" y="44" width="25" height="6" rx="2" />
        </>
      ) : kind === "image" ? (
        <>
          <circle cx="63" cy="17" r="5" />
          <path d="M8 46 29 23 46 39 58 29 80 46Z" />
        </>
      ) : kind === "chart" || kind === "kpi" ? (
        <>
          <rect x="14" y="30" width="12" height="17" rx="2" />
          <rect x="35" y="20" width="12" height="27" rx="2" />
          <rect x="56" y="10" width="12" height="37" rx="2" />
        </>
      ) : kind === "text" ? (
        <>
          <path d="M10 13h46M10 24h66M10 34h66M10 44h43" />
        </>
      ) : kind === "checkbox" ? (
        <>
          <rect x="10" y="19" width="18" height="18" rx="4" />
          <path d="m14 28 4 4 8-9M38 24h35M38 32h25" />
        </>
      ) : (
        <>
          <path d="M10 12h29" />
          <rect x="9" y="21" width="70" height="23" rx="5" />
          <path
            d={
              kind === "button"
                ? "M32 32h24m-5-4 5 4-5 4"
                : kind === "combobox"
                  ? "m65 30 4 4 4-4"
                  : "M17 32h32"
            }
          />
        </>
      )}
    </svg>
  );
}
