/** Real sandboxed frame renders native components and sends no preview/cart/order commands. */
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import Canvas from "../studio/StorefrontCanvas";
it("renders native products in a static frame and emits only a local edit selection", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const request = vi
      .fn()
      .mockResolvedValue({ data: { brandName: "Actual brand" } }),
    onHome = vi.fn();
  render(
    <Canvas
      request={request}
      workspace="own-shop"
      channel="de"
      language="de-DE"
      device="mobile"
      products={[
        {
          id: "coat",
          name: "Actual coat",
          media: [
            { id: "image", url: "/media/demo/fashion/coat.png", view: "front" },
          ],
          price: 249,
          currency: "EUR",
        },
      ]}
      onHome={onHome}
    />,
  );
  const frame = screen.getByTitle("Vorschau") as HTMLIFrameElement;
  fireEvent.load(frame);
  await waitFor(() =>
    expect(
      within(frame.contentDocument!.body).getByText("Actual brand"),
    ).toBeVisible(),
  );
  expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
  expect(frame.getAttribute("src")).toBeNull();
  const doc = within(frame.contentDocument!.body);
  expect(doc.getAllByRole("img", { name: "Actual coat" })).toHaveLength(2);
  fireEvent.click(
    doc.getByRole("heading", { name: "Dein Stil. Ganz selbstverständlich." }),
  );
  expect(onHome).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Dein Stil. Ganz selbstverständlich." }),
    "hero",
  );
  expect(request).toHaveBeenCalledWith("/store-api/company", undefined, "GET", {
    salesChannel: "de",
    locale: "de-DE",
  });
});
