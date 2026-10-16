/** Real editor commands: insertion positions, stale/untrusted drags, caps and native undo remain consistent. */
import {
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
  act,
} from "../../../../frontend/tests/unit/package-test-support";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import ShopDesigner from "../studio/ShopDesigner";
import { placeBlock, useBlockEditing } from "../studio/useBlockEditing";
import useDesigner from "../studio/useDesigner";
import { newPage, newBlock } from "../model";
function transfer() {
  const data = new Map<string, string>();
  return {
    setData: (k: string, v: string) => data.set(k, v),
    getData: (k: string) => data.get(k) ?? "",
    get types() {
      return [...data.keys()];
    },
    effectAllowed: "",
    dropEffect: "",
  };
}
const page = {
  ...newPage("default", "en-GB", "Shop"),
  slug: "home",
  revision: 3,
};
page.content.blocks.push(newBlock("text", "en-GB", "Existing text"));
const context = {
  mainLocale: "en-GB",
  locales: ["en-GB"],
  installed: ["site_builder", "site_forms"],
  channels: [{ id: "default", data: { name: { "en-GB": "Main" } } }],
  catalogue: { elements: [] },
};
it("drags a palette element between existing sections, then moves it to the start and undoes both operations", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [page] },
  );
  render(
    <LocaleScope locale="en-GB">
      <ShopDesigner
        request={request}
        workspace="drag"
        rights={["channels.manage"]}
        sandbox
        onEnvironments={() => {}}
      />
    </LocaleScope>,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Elements" }));
  const dataTransfer = transfer();
  fireEvent.dragStart(
    screen.getByRole("button", { name: /Image.*A photograph/ }),
    { dataTransfer },
  );
  const target = document.querySelector('[data-drop-position="1"]')!;
  fireEvent.dragOver(target, { dataTransfer });
  expect(target).toHaveClass("active");
  expect(target).toHaveTextContent("Drop here");
  fireEvent.drop(target, { dataTransfer });
  const blocks = () =>
    [...document.querySelectorAll("[data-block-id]")].map((e) =>
      e.getAttribute("data-block-id"),
    );
  expect(blocks()[0]).toBe(page.content.blocks[0].id);
  expect(blocks()[2]).toBe(page.content.blocks[1].id);
  const inserted = blocks()[1];
  const drag = document.querySelector(
    `[data-editor-block="${inserted}"] [draggable]`,
  )!;
  const move = transfer();
  fireEvent.dragStart(drag, { dataTransfer: move });
  fireEvent.dragOver(document.querySelector('[data-drop-position="0"]')!, {
    dataTransfer: move,
  });
  fireEvent.drop(document.querySelector('[data-drop-position="0"]')!, {
    dataTransfer: move,
  });
  expect(blocks()[0]).toBe(inserted);
  fireEvent.click(
    document.querySelector('.designer-preview-bar [aria-label="Undo"]')!,
  );
  expect(blocks()[1]).toBe(inserted);
  fireEvent.click(
    document.querySelector('.designer-preview-bar [aria-label="Undo"]')!,
  );
  expect(blocks()).toEqual(page.content.blocks.map((b) => b.id));
  expect(request.mock.calls.some(([path]) => path.includes("save_page"))).toBe(
    false,
  );
});
it("rejects external drag payloads and exposes no editing tools to a read-only caller", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [page] },
  );
  render(
    <LocaleScope locale="en-GB">
      <ShopDesigner
        request={request}
        workspace="readonly"
        rights={["channels.read"]}
        sandbox={false}
        onEnvironments={() => {}}
      />
    </LocaleScope>,
  );
  await screen.findByRole("heading", { name: "Existing text" });
  expect(document.querySelector("[data-drop-position]")).toBeNull();
  expect(document.querySelector(".designer-section-tools")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Elements" }));
  const button = screen.getByRole("button", { name: /Image.*A photograph/ });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("draggable", "false");
});
it("caps insertions but allows reordering full pages and rejects stale IDs/invalid offsets", () => {
  const blocks = Array.from({ length: 24 }, (_, i) =>
    newBlock("text", "en-GB", String(i)),
  );
  expect(placeBlock(blocks, newBlock("image", "en-GB", "New"), 0, false)).toBe(
    blocks,
  );
  expect(placeBlock(blocks, blocks[0], 24, true).at(-1)).toBe(blocks[0]);
  expect(placeBlock(blocks, blocks[0], 1, true)).toBe(blocks);
  expect(placeBlock(blocks, newBlock("text", "en-GB", "Stale"), 0, true)).toBe(
    blocks,
  );
  expect(placeBlock(blocks, blocks[0], 25, true)).toBe(blocks);
});
it("cancels a drag when its channel changes and ignores a forged external token", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [page] },
  );
  const hook = renderHook(() => {
    const d = useDesigner(request, "scope");
    return {
      d,
      editing: useBlockEditing({
        d,
        enabled: true,
        scope: d.channel,
        prepare: () => page,
        onSelect: vi.fn(),
      }),
    };
  });
  await waitFor(() => expect(hook.result.current.d.loaded).toBe(true));
  act(() => hook.result.current.d.open(page));
  const dataTransfer = transfer(),
    event = {
      dataTransfer,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;
  act(() =>
    hook.result.current.editing.begin(event, page.content.blocks[0], true),
  );
  dataTransfer.setData("application/x-veyndo-site-element", "forged");
  act(() => hook.result.current.editing.drop(event, 2));
  expect(hook.result.current.d.draft?.content.blocks[0].id).toBe(
    page.content.blocks[0].id,
  );
  act(() => hook.result.current.d.changeChannel("second"));
  act(() => hook.result.current.editing.drop(event, 2));
  expect(hook.result.current.d.draft).toBeUndefined();
  expect(hook.result.current.editing.dragging).toBe(false);
});

it("can undo the first click insertion into a previously native home", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [] },
  );
  const native = { ...page, id: "new-home", revision: 0 };
  const hook = renderHook(() => {
    const d = useDesigner(request, "native");
    return {
      d,
      editing: useBlockEditing({
        d,
        enabled: true,
        scope: "native",
        prepare: () => native,
        onSelect: vi.fn(),
      }),
    };
  });
  await waitFor(() => expect(hook.result.current.d.loaded).toBe(true));
  act(() =>
    hook.result.current.editing.insert(newBlock("image", "en-GB", "Added")),
  );
  expect(hook.result.current.d.draft?.content.blocks).toHaveLength(3);
  act(() => hook.result.current.d.undo());
  expect(hook.result.current.d.draft?.content.blocks.map((b) => b.id)).toEqual(
    native.content.blocks.map((b) => b.id),
  );
});
