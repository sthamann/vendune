/** Shared connector presentation registry; settings and capabilities are owned by each app package. */
import analytics from "../../../../extensions/apps/google-analytics/studio/connector.json";
import gmail from "../../../../extensions/apps/gmail/studio/connector.json";
import slack from "../../../../extensions/apps/slack/studio/connector.json";
type Descriptor = {
  hint: string;
  sources: boolean;
  sync: boolean;
  fields: { key: string; label: string; placeholder: string }[];
  choices?: { action: string; key: string; label: string };
  toggle?: { key: string; label: string };
};
export const connectorDescriptors: Record<string, Descriptor> = {
  google_analytics: analytics,
  gmail,
  slack,
};
