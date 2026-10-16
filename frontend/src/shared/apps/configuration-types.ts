/** Shared configuration projection; the Manifest, storefront and Studio use the same declared input contract. */
export type InputField = {
  name: string;
  kind: "integer" | "boolean" | "string";
  label: Record<string, string>;
  required: boolean;
  references?: string;
  choices?: { value: string; label: Record<string, string> }[];
  validation?: {
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
  };
};
export type ConfigurationContract = {
  entity: string;
  inputField: string;
  label: Record<string, string>;
  hint: Record<string, string>;
  currency?: string;
  inputs?: {
    fields: InputField[];
    arguments: string[];
    recordField?: string;
    examples?: {
      id: string;
      label: Record<string, string>;
      fields: Record<string, unknown>;
      materialFeeMinor: number;
      expectedFeeMinor: number | null;
    }[];
  };
};
