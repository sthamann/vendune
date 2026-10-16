/** Installed package metadata used by app administration views. */
import type { Entity } from "./AppEntity";
export type Package = {
  uiUrl?: string;
  managedBy?: "experience" | null;
  connections?: import("../../../../extensions/apps/storyfront/studio/storyfront-model").FrontendConnection[];
  id: string;
  version: string;
  active: boolean;
  revision: number;
  manifest: {
    configuration?: import("../../shared/apps/configuration-types").ConfigurationContract;
    settings?: import("../../shared/apps/native/types").Manifest["settings"];
    paymentProvider?: import("../../shared/apps/native/types").Manifest["paymentProvider"];
    name: Record<string, string>;
    category?: string;
    presentation?: {
      icon?: string;
      cover?: string;
      description?: Record<string, string>;
    };
    surfaces?: {
      id: string;
      location: string;
      label: Record<string, string>;
    }[];
    events?: string[];
    slots?: { location: string }[];
    runtime?: string;
    permissions: string[];
    entities: Entity[];
    actions: {
      name: string;
      description: string;
      handler: string;
      inputSchema?: { properties?: Record<string, { type?: string }> };
    }[];
  };
};
