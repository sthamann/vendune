/** Screenshot bounds and invalid-file recovery use the actual reference input and existing agent payload. */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import DesignReferences from "../studio/DesignReferences";
import { prepareDesignImage } from "../studio/design-images";
it("reduces a normal large screenshot before sending it and closes decoded image resources", async () => {
  const close = vi.fn(),
    drawImage = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 3590, height: 1838, close })),
  );
  const context = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ fillRect: vi.fn(), drawImage } as any);
  const encode = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/webp;base64,AAAA");
  try {
    const value = await prepareDesignImage(
      new File([new Uint8Array(2_000_000)], "shop.png", { type: "image/png" }),
    );
    expect(value).toBe("data:image/webp;base64,AAAA");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1024);
    expect(close).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledWith("image/webp", 0.9);
  } finally {
    context.mockRestore();
    encode.mockRestore();
    vi.unstubAllGlobals();
  }
});
it("rejects decompression-size limits and always releases the bitmap", async () => {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 8192, height: 8192, close })),
  );
  try {
    await expect(
      prepareDesignImage(new File(["x"], "huge.png", { type: "image/png" })),
    ).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});
it("preserves previous reference images after an invalid upload and keeps a useful error", async () => {
  const onImages = vi.fn(),
    onError = vi.fn();
  render(
    <LocaleScope locale="en-GB">
      <DesignReferences
        urls=""
        images={["data:image/png;base64,AAAA"]}
        onUrls={vi.fn()}
        onImages={onImages}
        onError={onError}
        onBusy={vi.fn()}
        onPrompt={vi.fn()}
        disabled={false}
      />
    </LocaleScope>,
  );
  fireEvent.change(screen.getByLabelText("Upload screenshots or designs"), {
    target: {
      files: [new File(["<svg/>"], "design.svg", { type: "image/svg+xml" })],
    },
  });
  await waitFor(() =>
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("previous references are unchanged"),
    ),
  );
  expect(onImages).not.toHaveBeenCalled();
  expect(screen.getByRole("img")).toBeVisible();
});
