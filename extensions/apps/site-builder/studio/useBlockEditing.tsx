/** Local editor gestures share one bounded document mutation path; drag payloads never contain executable/app data. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import type { Block, Page } from "../model";
import type { Designer } from "./useDesigner";
import usePointerPlacement from "./usePointerPlacement";
const mime = "application/x-veyndo-site-element";
type Source = {
  token: string;
  page: string;
  block: Block;
  moving: boolean;
  scope: string;
};
export function placeBlock(
  blocks: Block[],
  block: Block,
  at: number,
  moving: boolean,
): Block[] {
  if (!Number.isInteger(at) || at < 0 || at > blocks.length) return blocks;
  const from = blocks.findIndex((b) => b.id === block.id);
  if (moving ? from < 0 : from >= 0 || blocks.length >= 24) return blocks;
  const next = [...blocks];
  if (moving) next.splice(from, 1);
  next.splice(
    at - (moving && from < at ? 1 : 0),
    0,
    moving ? blocks[from] : block,
  );
  return next.every((b, i) => b === blocks[i]) ? blocks : next;
}
export function useBlockEditing({
  d,
  enabled,
  scope,
  prepare,
  onSelect,
}: {
  d: Designer;
  enabled: boolean;
  scope: string;
  prepare: () => Page | undefined;
  onSelect: () => void;
}) {
  const [dragging, setDragging] = useState(false),
    [target, setTarget] = useState<number | null>(null);
  const source = useRef<Source | undefined>(undefined);
  const live = useRef({ d, enabled, scope });
  live.current = { d, enabled, scope };
  const cancel = () => {
    source.current = undefined;
    setDragging(false);
    setTarget(null);
  };
  useEffect(() => {
    cancel();
  }, [scope, enabled]);
  useEffect(() => {
    if (source.current && source.current.page !== d.draft?.id) cancel();
  }, [d.draft?.id]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const select = (id: string) => {
    d.setSelected(id);
    onSelect();
  };
  const insert = (block: Block, at?: number) => {
    if (!enabled) return;
    const page = d.draft ?? prepare();
    if (!page) return;
    const selected = page.content.blocks.findIndex((b) => b.id === d.selected);
    const blocks = placeBlock(
      page.content.blocks,
      block,
      at ?? (selected < 0 ? page.content.blocks.length : selected + 1),
      false,
    );
    if (blocks === page.content.blocks) return;
    if (!d.draft) d.open(page);
    d.edit({ ...page, content: { blocks } }, page);
    select(block.id);
  };
  const move = (id: string, delta: number) => {
    const page = d.draft;
    if (!enabled || !page) return;
    const from = page.content.blocks.findIndex((b) => b.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= page.content.blocks.length) return;
    const blocks = placeBlock(
      page.content.blocks,
      page.content.blocks[from],
      to + (delta > 0 ? 1 : 0),
      true,
    );
    d.edit({ ...page, content: { blocks } });
    select(id);
  };
  const remove = (id: string) => {
    const page = d.draft;
    if (!enabled || !page || !page.content.blocks.some((b) => b.id === id))
      return;
    const blocks = page.content.blocks.filter((b) => b.id !== id);
    d.edit({ ...page, content: { blocks } });
    select(blocks[0]?.id ?? "");
  };
  const start = (block: Block, moving: boolean) => {
    const { d, enabled, scope } = live.current;
    const page = d.draft ?? prepare();
    if (!enabled || !page || (!moving && page.content.blocks.length >= 24))
      return false;
    if (!d.draft) d.open(page);
    source.current = {
      token: crypto.randomUUID(),
      page: page.id,
      block,
      moving,
      scope,
    };
    setDragging(true);
    return true;
  };
  const begin = (event: DragEvent, block: Block, moving = false) => {
    if (!start(block, moving)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(mime, source.current!.token);
    event.dataTransfer.effectAllowed = moving ? "move" : "copy";
  };
  const commit = (at: number) => {
    const value = source.current,
      current = live.current,
      page = current.d.draft;
    if (
      value &&
      current.enabled &&
      current.scope === value.scope &&
      page?.id === value.page
    ) {
      const blocks = placeBlock(
        page.content.blocks,
        value.block,
        at,
        value.moving,
      );
      if (blocks !== page.content.blocks) {
        current.d.edit({ ...page, content: { blocks } });
        current.d.setSelected(value.block.id);
        onSelect();
      }
    }
    cancel();
  };
  const pointer = usePointerPlacement({
    enabled,
    start,
    hover: setTarget,
    commit,
    cancel,
    active: () => !!source.current,
  });
  const accepts = (event: DragEvent) =>
    enabled &&
    source.current?.scope === scope &&
    event.dataTransfer.types.includes(mime);
  const over = (event: DragEvent, at: number) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = source.current!.moving ? "move" : "copy";
    setTarget(at);
  };
  const drop = (event: DragEvent, at: number) => {
    const value = source.current;
    if (
      !accepts(event) ||
      !value ||
      event.dataTransfer.getData(mime) !== value.token
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    commit(at);
  };
  return {
    pointer,
    enabled,
    dragging,
    target,
    begin,
    over,
    drop,
    cancel,
    insert,
    move,
    remove,
  };
}
export type BlockEditing = ReturnType<typeof useBlockEditing>;
export const BlockEditingContext = createContext<BlockEditing | null>(null);
export const useBlocks = () => useContext(BlockEditingContext);
