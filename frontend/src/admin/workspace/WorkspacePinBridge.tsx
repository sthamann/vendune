/** The shared grid pins criteria in the existing actor-private workspace; rows and credentials are never copied. */
import {
  safePinnedCriteria,
  clearPinnedView,
} from "../../shared/grid/pinned-view";
import { clearGoalFlow } from "../automation/goal-template";
import { useEffect } from "react";
import { useStudio } from "../shell/StudioContext";
import { canOpenStudio } from "../shell/permissions";
import { newArea, type WorkspaceRecord } from "./workspace-model";
import { useWorkspaceText } from "./workspace-i18n";
export default function WorkspacePinBridge() {
  const { liveRequest, workspace, tab, access, setNotice, setError } =
      useStudio(),
    t = useWorkspaceText();
  useEffect(
    () => () => {
      clearPinnedView();
      clearGoalFlow();
    },
    [workspace, liveRequest],
  );
  useEffect(() => {
    let current = true,
      busy = false;
    const pin = async (event: Event) => {
      if (busy || !canOpenStudio(tab, access)) return;
      const detail = (
        event as CustomEvent<{
          criteria: Record<string, string | boolean>;
          title: string;
        }>
      ).detail;
      if (!detail?.criteria) return;
      busy = true;
      try {
        const value = (await liveRequest(
          "/api/studio/workspace",
        )) as WorkspaceRecord;
        if (!current) return;
        const area =
          value.data.areas.find((a) => a.id === value.data.active) ??
          value.data.areas[0] ??
          newArea(t("title"), "owner", access);
        if (area.pins.length >= 20) throw new Error(t("error"));
        const next = {
          ...area,
          pins: [
            ...area.pins,
            {
              tab,
              title: detail.title.slice(0, 100),
              query: JSON.stringify(safePinnedCriteria(detail.criteria)),
            },
          ],
        };
        await liveRequest(
          "/api/studio/workspace",
          {
            revision: value.revision,
            data: {
              ...value.data,
              active: area.id,
              areas: [
                ...value.data.areas.filter((a) => a.id !== area.id),
                next,
              ],
            },
          },
          "PUT",
        );
        if (current) setNotice({ key: "workspacePinned" });
      } catch (e) {
        if (current) setError((e as Error).message);
      } finally {
        busy = false;
      }
    };
    window.addEventListener("veyndo.workspace.pin", pin);
    return () => {
      current = false;
      window.removeEventListener("veyndo.workspace.pin", pin);
    };
  }, [liveRequest, workspace, tab, access]);
  return null;
}
