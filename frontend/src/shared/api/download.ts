/** Authenticated binary download, never placing session credentials in a URL. */
import { responseError } from "../i18n/errors-i18n";
import { browserRequest, browserSessionScope } from "./browser-session";
import { customerSessionGeneration } from "./customer-session";
export async function downloadFile(
  path: string,
  headers: Record<string, string>,
) {
  const tenant = headers["x-tenant"];
  const generation = customerSessionGeneration(tenant);
  const merchant = browserSessionScope();
  const r = await fetch(path, browserRequest(path, { headers }));
  if (!r.ok) {
    const v = await r.json();
    throw Object.assign(
      responseError(v.errors?.[0]?.detail ?? r.statusText, r.status),
      {
        customerScope: { tenant, generation },
      },
    );
  }
  const blob = await r.blob();
  if (
    customerSessionGeneration(tenant) !== generation ||
    browserSessionScope() !== merchant
  )
    throw Object.assign(responseError("Customer session expired", 401), {
      customerScope: { tenant, generation },
    });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    r.headers.get("content-disposition")?.match(/filename="?([^";]+)/)?.[1] ??
    "document.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
