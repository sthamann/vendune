/** Bounded private read models; aggregate users and customer identities have separate rights. */
export type Dimension = {
  dimension: string;
  label: string;
  events: number;
  contexts: number;
};
export type BehaviorReport = {
  salesChannelId: string;
  channels?: { id: string; name: string }[];
  days: number;
  totals: Record<string, number>;
  dimensions: Dimension[];
  daily: { day: string; events: number; contexts: number }[];
  products: {
    id: string;
    name: string;
    category: string;
    views: number;
    adds: number;
    questions: number;
    contexts: number;
  }[];
  graph: {
    observations: {
      source: string;
      target: string;
      kind: string;
      count: number;
    }[];
    semantic: { source: string; target: string; kind: string; state: string }[];
  };
  journeys: {
    session: string;
    last: string;
    events: number;
    identified: boolean;
  }[];
  canInspectJourneys: boolean;
  geoConfigured: boolean;
};
export type Journey = {
  session: string;
  truncated: boolean;
  canOpenCustomers: boolean;
  canOpenOrders: boolean;
  events: {
    id: string;
    kind: string;
    productId: string | null;
    customerId: string | null;
    customerRef?: string | null;
    time: string;
    orderId: string | null;
    orderNumber: string | null;
    dimensions: Record<string, string | null>;
  }[];
};
