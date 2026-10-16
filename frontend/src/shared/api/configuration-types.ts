/** Accepted configuration snapshots carry frozen public labels, selected values and their original source currency. */
export type ConfigurationValue =
  string | number | boolean | Record<string, string>;
export type ConfigurationSnapshot = {
  app?: string;
  productId?: string;
  fields?: Record<string, unknown>;
  text?: string;
  feeMinor: number;
  currency?: string;
  appVersion?: string;
  ruleRevision?: number;
  ruleFields?: Record<string, unknown>;
  presentation?: {
    title: Record<string, string>;
    mainLocale: string;
    fields: { label: Record<string, string>; value: ConfigurationValue }[];
  };
};
export type ConfigurationLine = {
  appConfigurations?: ConfigurationSnapshot[];
  configuration?: ConfigurationSnapshot;
};
export function configurationSnapshots(line: ConfigurationLine) {
  return (
    line.appConfigurations ?? (line.configuration ? [line.configuration] : [])
  );
}
