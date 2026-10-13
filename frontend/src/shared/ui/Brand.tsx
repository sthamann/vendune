/** Shared Sellama identity; product branding is independent of tenant-owned company logos and session keys. */
import "./brand.css";
export const BRAND = Object.freeze({
  name: "Sellama",
  studio: "Studio",
  repository: "https://github.com/sthamann/sellama",
  mark: "/brand/sellama-mark.svg",
  logo: "/brand/sellama-logo.svg",
  logoDark: "/brand/sellama-logo-dark.svg",
});
export default function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return markOnly ? (
    <img className="sellama-mark" src={BRAND.mark} alt={BRAND.name} />
  ) : (
    <span className="sellama-brand">
      <span className="sellama-logo-pair" role="img" aria-label={BRAND.name}>
        <img
          className="sellama-logo sellama-logo--light"
          src={BRAND.logo}
          alt=""
        />
        <img
          className="sellama-logo sellama-logo--dark"
          src={BRAND.logoDark}
          alt=""
        />
      </span>
      <span className="sellama-wordmark">
        <small>{BRAND.studio}</small>
      </span>
    </span>
  );
}
