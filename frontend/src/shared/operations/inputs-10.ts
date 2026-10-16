/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs10 {
  "merchant.site.plan": {
    content?: boolean;
    id: string;
    images?: Array<string>;
    instruction: string;
    revision: number;
    selected?: string;
    structure?: boolean;
    style?: boolean;
    urls?: Array<string>;
  };
  "merchant.site.apply": { approve: boolean; taskId: string };
  "studio.workspace.read": JsonValue;
  "studio.workspace.save": { data: JsonValue; revision: number };
  "merchant.customer.creation": JsonValue;
  "merchant.customer.create": {
    billingAddress: JsonValue;
    customerGroup: string;
    email: string;
    profile: JsonValue;
    requestKey: string;
    shippingAddress?: JsonValue | null;
  };
  "merchant.order.context": { channelId: string; locale?: string };
  "merchant.order.review": {
    channelId: string;
    checkout: JsonValue;
    codes?: Array<string>;
    currency: string;
    customerId: string;
    items: Array<{ id: string; quantity: number }>;
    locale: string;
  };
  "merchant.order.complete": {
    approve: boolean;
    cartToken: string;
    channelId: string;
    customerAcknowledgement: boolean;
    digitalImmediate: boolean;
    locale: string;
    policyVersion: string;
    requestKey: string;
    revision: number;
    terms: boolean;
    totalMinor: string;
  };
  "merchant.catalog.context": JsonValue;
  "merchant.catalog.prepare": {
    count: number;
    inference?: {
      model?: string | null;
      provider?: "platform" | "ollama" | "openai" | "anthropic";
    } | null;
    mode: "csv" | "url" | "demo";
    source: string;
  };
  "merchant.catalog.save": {
    approve: boolean;
    currency: string;
    demo: boolean;
    draft: {
      description: string;
      imageUrl?: string;
      name: string;
      price: number;
      productNumber?: string;
    };
    id: string;
    mainLocale: string;
    settingsRevision: number;
    taxRate: number;
  };
}
