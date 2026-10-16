/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs12 {
  "pos.create": { channelId: string };
  "pos.cart": { cartToken: string; channelId: string };
  "pos.replace": {
    cartToken: string;
    channelId: string;
    items: Array<{ id: string; quantity: number }>;
    revision: number;
  };
  "pos.select": {
    cartToken: string;
    channelId: string;
    checkout: JsonValue;
    revision: number;
  };
  "pos.accept": {
    cartToken: string;
    channelId: string;
    digitalImmediate: boolean;
    policyVersion: string;
    terms: boolean;
  };
  "pos.complete": {
    cartToken: string;
    channelId: string;
    requestKey: string;
    revision: number;
    tenderMinor?: string;
    totalMinor: string;
  };
  "pos.held": { channelId: string };
  "pos.sales": { channelId: string };
  "b2b.company.create": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.settings.save": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.configuration": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.requisition.import": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
}
