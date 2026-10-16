/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs11 {
  "pos.customers": { barcode?: string; channelId: string; query?: string };
  "pos.customer": {
    cartToken: string;
    channelId: string;
    customerId: string | null;
    revision: number;
  };
  "pos.discount": {
    cartToken: string;
    channelId: string;
    discount: JsonValue;
    revision: number;
  };
  "pos.receipt": { channelId: string; orderId: string; receiptId: string };
  "pos.channels": JsonValue;
  "pos.payment": { cartToken: string; channelId: string };
  "pos.reconcile": { cartToken: string; channelId: string; requestKey: string };
  "pos.catalog": {
    after?: string;
    barcode?: string;
    cartToken?: string;
    channelId: string;
    query?: string;
  };
  "pos.context": { channelId: string };
  "pos.detail": {
    after?: string;
    cartToken?: string;
    channelId: string;
    productId: string;
  };
  "pos.currency": {
    cartToken: string;
    channelId: string;
    currency: string;
    revision: number;
  };
  "pos.coupons": {
    cartToken: string;
    channelId: string;
    codes: Array<string>;
    revision: number;
  };
}
