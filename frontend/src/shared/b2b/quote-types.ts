/** Canonical procurement quote wire contract shared by buyer and merchant clients. */
import type { Cart } from "../api/shop-api";
export type Quote = {
  id: string;
  unitId: string;
  buyerId: string;
  state: string;
  workflow?: {
    mainLocale?: string;
    preparation?: boolean;
    label?: Record<string, string>;
    actions: {
      id: string;
      label: Record<string, string>;
      enabled: boolean;
      reason?: string;
    }[];
  } | null;
  revision: number;
  data: {
    quote: Cart;
    message: string;
    currency: string;
    validUntil?: string;
    orderId?: string;
    lines?: { id: string; quantity: number; grossMinor: number }[];
    messages: { merchant: boolean; message: string; createdAt: string }[];
  };
};
