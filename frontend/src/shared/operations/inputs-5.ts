/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs5 {
  "merchant.receipt.create": {
    deliveryIndex?: number;
    id: string;
    kind: "invoice" | "delivery_note" | "cancellation";
    locale: "en" | "de" | "fr" | "es";
    referenceId?: string;
    requestKey: string;
    revision: number;
  };
  "merchant.payment": {
    amountMinor?: number;
    approve: boolean;
    id: string;
    operation:
      "capture" | "authorize" | "void" | "refund" | "reconcile" | "cancel";
    requestKey: string;
  };
  "merchant.payment.providers": JsonValue;
  "merchant.payment.onboarding": {
    approve?: boolean;
    channel?: string;
    country?: string;
    environment?: "sandbox" | "live" | "contract-fixture";
    id?: string;
    operation?: "start" | "status" | "disconnect";
    requestKey?: string;
  };
  "developer.archive": { app: string; approve: boolean; archived: boolean };
  "developer.builds": JsonValue;
  "developer.import": {
    environment: string;
    manifest: JsonValue;
    prompt: string;
    summary: JsonValue;
  };
  "developer.stage": { approve: boolean; buildId: string; digest: string };
  "developer.task": { agent: string; environment: string; prompt: string };
  "catalog.search": {
    after?: string;
    category?: string;
    categoryId?: string;
    ids?: Array<string>;
    limit?: number;
    query?: string;
    search?: string;
  };
  "catalog.detail": { after?: string; limit?: number; productId: string };
  "checkout.options": JsonValue;
}
