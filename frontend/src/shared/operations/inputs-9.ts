/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs9 {
  "knowledge.experiment.report": { id?: string };
  "catalog.facts": { productId?: string };
  "knowledge.autonomy.apply": { taskId?: string };
  "knowledge.claims": { productId?: string };
  "knowledge.claim.propose": {
    confidence?: number;
    contentHash?: string;
    locale?: string;
    nodeType?:
      | "product"
      | "variant"
      | "material"
      | "property"
      | "intent"
      | "problem"
      | "occasion"
      | "audience"
      | "claim"
      | "return_reason"
      | "supplier"
      | "policy"
      | "document"
      | "support";
    productId?: string;
    quote?: string;
    sourceId?: string;
    text?: string;
  };
  "knowledge.claim.review": {
    approve?: boolean;
    id?: string;
    revision?: number;
    state?: "evidenced" | "confirmed" | "rejected";
  };
  "knowledge.extract": {
    inference?: JsonValue;
    locale?: string;
    productId?: string;
    sourceId?: string;
  };
  "knowledge.compile": {
    claims?: Array<{ id: string; text: string }>;
    productId?: string;
  };
  "merchant.app.history": {
    app: string;
    approve?: boolean;
    entity: string;
    id: string;
    revision?: number;
    version?: number;
  };
  "merchant.app.restore": {
    app: string;
    approve: boolean;
    entity: string;
    id: string;
    revision: number;
    version: number;
  };
  "merchant.site.task": {
    agent?: "codex" | "claude_code";
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
  };
  "merchant.site.propose": {
    fields: JsonValue;
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
    summary?: string;
  };
}
