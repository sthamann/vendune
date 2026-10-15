/** Miniature component layouts communicate what each element adds without loading apps or remote images. */
import type { BlockKind } from "../model";
export default function BlockPreview({ kind }: { kind: BlockKind }) {
  return (
    <svg
      className={`designer-block-art art-${kind}`}
      viewBox="0 0 180 94"
      aria-hidden="true"
    >
      <rect className="art-paper" x="8" y="6" width="164" height="82" rx="9" />
      {kind === "hero" && (
        <>
          <rect
            className="art-image"
            x="92"
            y="17"
            width="68"
            height="60"
            rx="7"
          />
          <path className="art-line" d="M21 30h55M21 40h42M21 51h51" />
          <rect
            className="art-accent"
            x="21"
            y="62"
            width="33"
            height="10"
            rx="4"
          />
          <circle className="art-sun" cx="137" cy="34" r="9" />
          <path className="art-hill" d="m97 69 20-23 17 15 12-12 13 20Z" />
        </>
      )}
      {kind === "text" && (
        <>
          <path className="art-heading" d="M24 27h88" />
          <path
            className="art-line"
            d="M24 41h131M24 51h125M24 61h131M24 71h91"
          />
        </>
      )}
      {kind === "products" &&
        [20, 69, 118].map((x) => (
          <g key={x}>
            <rect
              className="art-image"
              x={x}
              y="18"
              width="41"
              height="43"
              rx="5"
            />
            <path className="art-line" d={`M${x} 70h32`} />
            <rect
              className="art-accent"
              x={x}
              y="76"
              width="18"
              height="4"
              rx="2"
            />
          </g>
        ))}
      {kind === "image" && (
        <>
          <rect
            className="art-image"
            x="20"
            y="16"
            width="140"
            height="62"
            rx="7"
          />
          <circle className="art-sun" cx="127" cy="34" r="10" />
          <path className="art-hill" d="m24 74 39-42 34 31 23-20 35 31Z" />
        </>
      )}
      {kind === "form" && (
        <>
          <path className="art-heading" d="M23 25h75" />
          <rect
            className="art-field"
            x="23"
            y="36"
            width="65"
            height="13"
            rx="4"
          />
          <rect
            className="art-field"
            x="94"
            y="36"
            width="64"
            height="13"
            rx="4"
          />
          <rect
            className="art-field"
            x="23"
            y="55"
            width="135"
            height="14"
            rx="4"
          />
          <rect
            className="art-accent"
            x="23"
            y="75"
            width="39"
            height="6"
            rx="3"
          />
        </>
      )}
      {kind === "articles" &&
        [21, 94].map((x) => (
          <g key={x}>
            <rect
              className="art-image"
              x={x}
              y="18"
              width="64"
              height="33"
              rx="5"
            />
            <path className="art-heading" d={`M${x} 62h49`} />
            <path className="art-line" d={`M${x} 72h61M${x} 79h45`} />
          </g>
        ))}
      {kind === "app" && (
        <>
          <rect
            className="art-image"
            x="21"
            y="20"
            width="47"
            height="52"
            rx="8"
          />
          <path className="art-heading" d="M81 29h68" />
          <path className="art-line" d="M81 43h65M81 53h51" />
          <rect
            className="art-accent"
            x="81"
            y="65"
            width="42"
            height="8"
            rx="4"
          />
          <path className="art-symbol" d="M34 39h20M34 49h20M44 29v30" />
        </>
      )}
    </svg>
  );
}
