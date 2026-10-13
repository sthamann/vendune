/** Shared seLLM identity; product branding is independent of tenant-owned company logos and session keys. */
import "./brand.css";
export const BRAND = Object.freeze({
  name: "seLLM",
  studio: "Studio",
  repository: "https://github.com/sthamann/sellm",
  mark: "/brand/sellm-mark.svg",
  logo: "/brand/sellm-logo.svg",
  logoDark: "/brand/sellm-logo-dark.svg",
});
export default function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return markOnly ? (
    <img className="sellm-mark" src={BRAND.mark} alt={BRAND.name} />
  ) : (
    <span className="sellm-brand">
      <span className="sellm-logo-pair" role="img" aria-label={BRAND.name}>
        <img
          className="sellm-logo sellm-logo--light"
          src={BRAND.logo}
          alt=""
        />
        <img
          className="sellm-logo sellm-logo--dark"
          src={BRAND.logoDark}
          alt=""
        />
      </span>
      <span className="sellm-wordmark">
        <small>{BRAND.studio}</small>
      </span>
    </span>
  );
}
