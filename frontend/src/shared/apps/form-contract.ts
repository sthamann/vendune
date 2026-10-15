/** Public form block contract shared through the host, never by importing another app's implementation. */
import type { RequestFn } from "../api/types";
export type FormField = {
  id: string;
  kind: "text" | "email" | "textarea" | "checkbox" | "number";
  required: boolean;
  label: Record<string, string>;
};
export type PublicFormProps = {
  block: { id: string; fields: FormField[] };
  page: string;
  channel: string;
  language: string;
  mainLocale: string;
  request: RequestFn;
  preview?: boolean;
};

export type FormInboxProps = {
  request: RequestFn;
  pageId: string;
  labels: Record<string, Record<string, string>>;
  mainLocale: string;
};
