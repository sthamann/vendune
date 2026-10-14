/** Shared Veyndo identity; product branding is independent of tenant-owned company logos and session keys. */
import "./brand.css";
export const BRAND = Object.freeze({
  name: "VEYNDO",
  studio: "Studio",
  repository: "https://github.com/sthamann/veyndo",
  mark: "/brand/veyndo-mark.svg?v=blue-20261014",
  logo: "/brand/veyndo-logo.svg?v=blue-20261014",
  logoDark: "/brand/veyndo-logo-dark.svg?v=blue-20261014",
});
export default function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return markOnly ? (
    <img className="veyndo-mark" src={BRAND.mark} alt={BRAND.name} />
  ) : (
    <span className="veyndo-brand">
      <span className="veyndo-logo-pair" role="img" aria-label={BRAND.name}>
        <img
          className="veyndo-logo veyndo-logo--light"
          src={BRAND.logo}
          alt=""
        />
        <img
          className="veyndo-logo veyndo-logo--dark"
          src={BRAND.logoDark}
          alt=""
        />
      </span>
      <span className="veyndo-wordmark">
        <small>{BRAND.studio}</small>
      </span>
    </span>
  );
}
