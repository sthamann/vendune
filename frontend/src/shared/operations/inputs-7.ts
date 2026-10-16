/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs7 {
  "cart.create": { session?: string };
  "cart.replace": {
    items: Array<{
      id: string;
      quantity: number;
      [key: string]: JsonValue | undefined;
    }>;
    revision: number;
  };
  "cart.quote": JsonValue;
  "checkout.complete": { idempotency_key: string };
  "merchant.plan": { instruction: string };
  "merchant.apply": { approve: boolean; task_id: string };
  "merchant.orders": {
    after?: string;
    channelId?: string;
    customer?: string;
    deliveryState?: string;
    direction?: "asc" | "desc";
    from?: string;
    limit?: number;
    paymentState?: string;
    query?: string;
    sort?: "created" | "number" | "customer" | "total" | "state";
    state?: string;
    to?: string;
  };
  "merchant.run.create": {
    approve?: boolean;
    id?: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction: string;
    requestId?: string;
    revision?: number;
  };
  "merchant.run.status": {
    approve?: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision?: number;
  };
  "merchant.run.cancel": {
    approve: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision: number;
  };
  "merchant.run.resume": {
    approve: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision: number;
  };
  "merchant.agents.status": JsonValue;
}
