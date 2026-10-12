/** Cashier tools transmit revision-owner commands; financial outputs and printer content remain server-owned. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import RegisterCatalog from "../../src/admin/pos/RegisterCatalog";
import RegisterCart from "../../src/admin/pos/RegisterCart";
import RegisterDiscount from "../../src/admin/pos/RegisterDiscount";
import RegisterCustomer from "../../src/admin/pos/RegisterCustomer";
import RegisterAssistant from "../../src/admin/pos/RegisterAssistant";
import ReceiptPrinter from "../../src/admin/pos/ReceiptPrinter";
import type { Channel } from "../../src/admin/channels/channel-model";
import type { useRegister } from "../../src/admin/pos/useRegister";
vi.mock("../../src/admin/pos/pos-i18n", () => ({
  usePosText: () => (key: string) => key,
}));
vi.mock("../../src/shared/i18n/i18n", () => ({
  useLocale: () => ({ locale: "en-GB" }),
}));
vi.mock("../../src/shared/apps/AppSurfaces", () => ({
  AppSurfaceSlot: () => null,
}));
vi.mock("../../src/admin/pos/RegisterAdjustments", () => ({
  default: () => null,
}));
vi.mock("../../src/admin/pos/RegisterCheckout", () => ({
  default: () => <button>checkout</button>,
}));
function register() {
  return {
    cart: {
      id: "cart",
      customerEmail: "",
      lineItems: [{ label: "Jacket", quantity: 1 }],
      price: {
        currency: "EUR",
        currencyScale: 2,
        totalPrice: 99.9,
        totalMinor: "9990",
      },
    },
    order: { id: "order" },
    busy: false,
    error: "",
    adjust: vi.fn(async () => {}),
    command: vi.fn(async () => ({ elements: [] })),
    advice: vi.fn(async () => ({ messages: [] })),
  } as unknown as ReturnType<typeof useRegister>;
}
beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("cashier workspace", () => {
  it("does not retain duplicate customer or discount tools when a sale is parked or resumed", () => {
    const r = register();
    r.cart!.lineItems = [];
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const props = {
      channel: "register",
      mainLocale: "en-GB",
      rights: ["customers.read", "customers.pii", "payments.manage"],
    };
    const view = render(<RegisterCart register={r} {...props} />);
    for (const id of ["next-sale", "held-sale", "next-sale"]) {
      const next = { ...r, cart: { ...r.cart!, id } };
      view.rerender(<RegisterCart register={next} {...props} />);
      expect(
        screen.getAllByRole("button", { name: /customer\s*walkIn/ }),
      ).toHaveLength(1);
      expect(screen.getAllByRole("group", { name: "discount" })).toHaveLength(
        1,
      );
      expect(screen.getAllByRole("button", { name: "checkout" })).toHaveLength(
        1,
      );
    }
    expect(errors).not.toHaveBeenCalled();
  });
  it("shows the authoritative customer price rather than the raw retail field", () => {
    const r = register();
    Object.assign(r, {
      catalog: vi.fn(),
      products: [
        {
          id: "jacket",
          name: "Jacket",
          stock: 2,
          price: 99.9,
          calculated_price: { unitPrice: 79.9 },
        },
      ],
    });
    render(
      <RegisterCatalog
        register={r}
        channel={{ id: "register", data: { pos: { columns: 4 } } } as Channel}
      />,
    );
    expect(
      screen.getByRole("button", { name: "add: Jacket" }),
    ).toHaveTextContent("€79.90");
    expect(screen.queryByText("€99.90")).toBeNull();
  });
  it("requires a reason and sends exact basis points without changing the quote", async () => {
    const r = register();
    render(<RegisterDiscount register={r} />);
    fireEvent.click(screen.getByText("10%"));
    expect(screen.getByRole("button", { name: "apply" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("reason"), {
      target: { value: "Display item" },
    });
    fireEvent.click(screen.getByRole("button", { name: "apply" }));
    await waitFor(() =>
      expect(r.adjust).toHaveBeenCalledWith("discount", {
        discount: {
          kind: "percent",
          value: 1000,
          currency: "EUR",
          reason: "Display item",
        },
      }),
    );
    expect(r.cart!.price.totalMinor).toBe("9990");
    fireEvent.change(screen.getByLabelText("percentage"), {
      target: { value: "101" },
    });
    expect(screen.getByRole("button", { name: "apply" })).toBeDisabled();
  });
  it("scans the exact customer number and selects only a returned identity", async () => {
    const r = register();
    vi.mocked(r.command).mockResolvedValue({
      elements: [
        {
          id: "customer",
          name: "Ada",
          email: "ada@example.test",
          customerNumber: "C-1",
        },
      ],
    });
    render(<RegisterCustomer register={r} />);
    fireEvent.click(screen.getByText("walkIn"));
    fireEvent.change(screen.getByLabelText("customerSearch"), {
      target: { value: "C-1" },
    });
    fireEvent.submit(screen.getByLabelText("customerSearch").closest("form")!);
    await waitFor(() =>
      expect(r.command).toHaveBeenCalledWith("customers", { barcode: "C-1" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Ada/ }));
    await waitFor(() =>
      expect(r.adjust).toHaveBeenCalledWith("customer", {
        customerId: "customer",
      }),
    );
  });
  it("keeps AI advice read-only and excludes customer contact from its prompt", async () => {
    const r = register();
    r.cart!.customerEmail = "private@example.test";
    vi.mocked(r.advice).mockResolvedValue({
      messages: [{ role: "assistant", content: "Offer a scarf" }],
    });
    render(<RegisterAssistant register={r} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("assistantQuestion"), {
      target: { value: "What pairs well?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Offer a scarf",
    );
    expect(vi.mocked(r.advice).mock.calls[0][0]).toContain("Jacket");
    expect(vi.mocked(r.advice).mock.calls[0][0]).not.toContain(
      "private@example.test",
    );
    expect(r.adjust).not.toHaveBeenCalled();
  });
  it("prints immutable text safely on selected paper and reports blocked popups", async () => {
    const r = register();
    const page = document.implementation.createHTMLDocument("Receipt");
    const popup = {
      document: page,
      opener: null,
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.mocked(r.command).mockResolvedValue({
      number: "INV-1",
      lines: ["<img src=x onerror=alert(1)>", "Thank you"],
    });
    render(
      <ReceiptPrinter
        register={r}
        receipt={{ id: "receipt", number: "INV-1" }}
      />,
    );
    fireEvent.change(screen.getByLabelText("paper"), {
      target: { value: "58" },
    });
    fireEvent.click(screen.getByRole("button", { name: "printReceipt" }));
    await waitFor(() => expect(popup.print).toHaveBeenCalledOnce());
    expect(r.command).toHaveBeenCalledWith("receipt", {
      orderId: "order",
      receiptId: "receipt",
    });
    expect(page.querySelector("img")).toBeNull();
    expect(page.body.textContent).toContain("<img src=x");
    expect(page.head.textContent).toContain("58mm");
    vi.mocked(window.open).mockReturnValue(null);
    fireEvent.click(screen.getByRole("button", { name: "printReceipt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("popupBlocked");
  });
});
