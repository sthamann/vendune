/** Layouts are private presentation preferences, never roles or delegated permissions. */
import type { Tab } from "../shell/navigation";
import { canOpenStudio } from "../shell/permissions";
export type Preset =
  "owner" | "service" | "purchasing" | "content" | "development";
export type Pin = { title: string; tab: Tab; query: string };
export type Area = { id: string; name: string; cards: Tab[]; pins: Pin[] };
export type Goal = {
  id: string;
  title: string;
  status: "planned" | "working" | "review" | "done" | "stopped";
  taskId: string | null;
};
export type Workspace = { areas: Area[]; active: string; goals: Goal[] };
export type WorkspaceRecord = {
  revision: number;
  data: Workspace;
  versions?: { revision: number; data: Workspace; createdAt: string }[];
};
export const presets: Record<Preset, Tab[]> = {
  owner: ["overview", "orders", "channels", "environments", "agents"],
  service: ["customers", "orders", "apps", "knowledge"],
  purchasing: ["b2b", "customers", "orders", "automation"],
  content: ["productData", "design", "knowledge", "channels", "environments"],
  development: ["developers", "apps", "automation", "environments"],
};
export function suggestedPreset(rights: string[]): Preset {
  return rights.includes("team.manage")
    ? "owner"
    : rights.includes("b2b.manage")
      ? "purchasing"
      : rights.includes("developer.manage")
        ? "development"
        : rights.includes("catalog.write")
          ? "content"
          : "service";
}
export function newArea(name: string, preset: Preset, rights: string[]): Area {
  return {
    id: `area_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    name,
    cards: presets[preset].filter((t) => canOpenStudio(t, rights)),
    pins: [],
  };
}
export function moveCard(cards: Tab[], from: number, to: number): Tab[] {
  const next = [...cards];
  if (from < 0 || to < 0 || from >= cards.length || to >= cards.length)
    return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
