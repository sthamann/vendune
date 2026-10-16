/** Isolated viewport for native presentational components and the shared app renderer; no cart, analytics or orders run here. */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import { themeStyle, type SiteProduct } from "../Renderer";
import type { Theme } from "../model";
import NativeHomePreview, {
  PreviewHeader,
  PreviewFooter,
} from "./NativeHomePreview";
import { useDesignText } from "./design-i18n";
import { AppSurfaceProvider } from "../../../../frontend/src/shared/apps/AppSurfaces";
import "../../../../frontend/src/storefront/styles/shop.css";
import "../../../../frontend/src/storefront/styles/storefront-polish.css";
import "../../../../frontend/src/storefront/styles/company-identity.css";
export type HomeSnapshot = {
  title: string;
  image: string;
  collection: string;
  description: string;
};
export default function StorefrontCanvas({
  request,
  workspace,
  shopName,
  channel,
  language,
  device,
  children,
  onHome,
  appearance,
  products,
  onSnapshot,
  pageKey,
}: {
  pageKey?: string;
  request: RequestFn;
  workspace: string;
  shopName?: string;
  channel: string;
  language: string;
  device: "desktop" | "tablet" | "mobile";
  children?: ReactNode;
  onHome: (home: HomeSnapshot, section: "hero" | "products") => void;
  appearance?: Theme;
  products: SiteProduct[];
  onSnapshot?: (home: HomeSnapshot) => void;
}) {
  const t = useDesignText(),
    host = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement>(),
    [scale, setScale] = useState(1),
    [height, setHeight] = useState(900),
    [company, setCompany] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const canvas = host.current?.closest<HTMLElement>(".designer-canvas");
    if (canvas) canvas.scrollTop = 0;
  }, [pageKey, workspace, channel]);
  const width = device === "mobile" ? 390 : device === "tablet" ? 768 : 1280;
  const snapshotListener = useRef(onSnapshot);
  snapshotListener.current = onSnapshot;
  const publicRequest: RequestFn = useMemo(
    () => (path, body, method, options) =>
      request(path, body, method, {
        ...options,
        salesChannel: channel === "*" ? "default" : channel,
        locale: language,
      }),
    [request, channel, language],
  );
  useEffect(() => {
    let active = true;
    setCompany({});
    void request("/store-api/company", undefined, "GET", {
      salesChannel: channel === "*" ? "default" : channel,
      locale: language,
    })
      .then((v) => {
        if (active) setCompany(v.data ?? {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [request, workspace, channel, language]);
  useEffect(() => {
    const resize = () =>
      setScale(Math.min(1, (host.current?.clientWidth ?? width) / width));
    resize();
    const observer = new ResizeObserver(resize);
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [width]);
  const loaded = () => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    // Only static owned styles enter the frame. No scripts, source HTML, secrets or preview cookies.
    doc.head.replaceChildren();
    for (const source of document.head.querySelectorAll(
      'link[rel="stylesheet"],style',
    ))
      doc.head.append(source.cloneNode(true));
    const style = doc.createElement("style");
    style.textContent = `body{margin:0;background:#fff}.shop{min-height:100vh}.designer-native-region{cursor:pointer;outline:2px solid transparent;outline-offset:-2px}.designer-native-region:hover,.designer-native-region:focus-visible{outline-color:#189eff}.shop-nav button:disabled{opacity:.85}.shop-content{min-height:300px}`;
    doc.head.append(style);
    doc.documentElement.lang = language;
    setMount(doc.body);
  };
  useEffect(() => {
    if (!mount) return;
    const resize = () => setHeight(Math.max(700, mount.scrollHeight));
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    return () => observer.disconnect();
  }, [mount]);
  const snapshot = (): HomeSnapshot => {
    const doc = frame.current?.contentDocument;
    return {
      title: doc?.querySelector(".shop-hero h1")?.textContent?.trim() ?? "",
      description:
        doc
          ?.querySelector(".shop-hero>div>p:not(.shop-kicker)")
          ?.textContent?.trim() ?? "",
      image:
        doc
          ?.querySelector<HTMLImageElement>(".shop-hero img")
          ?.getAttribute("src") ?? "",
      collection:
        doc?.querySelector(".collection-title h2")?.textContent?.trim() ?? "",
    };
  };
  const select = (kind: "hero" | "products") => onHome(snapshot(), kind);
  useEffect(() => {
    if (mount && !children) snapshotListener.current?.(snapshot());
  }, [mount, products, language, children]);
  const name =
    company.brandName ||
    company.name ||
    shopName ||
    new URLSearchParams(location.search).get("shop") ||
    workspace;
  return (
    <div className="designer-storefront" ref={host}>
      {!mount && (
        <p className="designer-preview-status" role="status">
          {t("previewLoading")}
        </p>
      )}
      <div
        className="designer-frame-space"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          ref={frame}
          title={t("preview")}
          sandbox="allow-same-origin"
          srcDoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body></body></html>"
          onLoad={loaded}
          style={{ width, height, transform: `scale(${scale})` }}
        />
      </div>
      {mount &&
        createPortal(
          <AppSurfaceProvider
            request={publicRequest}
            public
            scopeKey={`${workspace}:${channel}:${language}`}
          >
            <LocaleScope locale={language}>
              <div
                className="shop"
                data-designed={appearance ? "true" : undefined}
                style={appearance ? themeStyle(appearance) : undefined}
                onClickCapture={(event) => {
                  const el = event.target as Element;
                  if (
                    el.closest("a,button") &&
                    !el.closest(".is-design-preview")
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!children) {
                      if (el.closest(".shop-hero")) select("hero");
                      else if (el.closest(".shop-collection"))
                        select("products");
                    }
                  }
                }}
                onSubmitCapture={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <PreviewHeader displayName={name} company={company} />
                {children || (
                  <NativeHomePreview products={products} onSelect={select} />
                )}
                <PreviewFooter name={name} />
              </div>
            </LocaleScope>
          </AppSurfaceProvider>,
          mount,
        )}
    </div>
  );
}
