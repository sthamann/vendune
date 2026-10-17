# Native register

`POSWorkspace` discovers authenticated POS channels, selects a register and links
recent sales to the existing order editor. `useRegister` owns bounded catalog
loading and serialized commands on the Studio request transport. It restores the
cashier's cart capability, retains a stable checkout key and recovers a committed
sale after a lost response.

`RegisterCatalog` uses the native product-family API for variants and barcode
resolution. `RegisterCart` and `RegisterCheckout` consume authoritative quotes;
`pos-model` converts tender text to integer minor units without a float roundtrip.
`RegisterReceipt` calls the existing immutable order-document and authenticated
PDF download owners. CSS is scoped and split into layout, completion and responsive
responsibilities. Vocabulary is typed EN/DE/FR/ES, merchant receipt text inherits
through the shared content-language editor.

Private app slots: `admin.pos.catalog`, `admin.pos.cart`, `admin.pos.receipt`.
Their permission-bound context comes from the existing app surface provider.
App business logic/assets remain in the app package, never in these host files.

No offline settlement, terminal driver, fiscal hardware/certification or shift
cash-book is implied. This register requires the server for every committed sale.

`Register.tsx` composes the sale. `useCashierFocus` owns URL focus/fullscreen controls;
`cashier.css` integrates with the existing Studio shell. `RegisterCustomer` resolves
account/card identities through native CRM. `RegisterDiscount` transmits integer
basis points/minor units and a required reason. `RegisterAssistant` calls the existing
merchant chat without apply controls. `ReceiptPrinter` safely renders the issued native
invoice text into a user-gesture popup and opens the OS print dialog. Dedicated
`cashier-i18n` keys share EN/DE/FR/ES and the Studio locale. No plugin-owned feature or
new order/payment/document/AI owner is introduced.

Receipt creation requires saved seller details in Settings → Company details.
The shared request-error vocabulary explains this refusal in EN/DE/FR/ES and
directs the cashier to retry the receipt, preserving the already recorded sale.

`RegisterCheckoutOptions` keeps payment/contact settings in the tools pane; `RegisterCheckout` keeps final tender and completion separate. `useRegisterViewport` measures actual available register height after translation, wrapping and viewport changes.
