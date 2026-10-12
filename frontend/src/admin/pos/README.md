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
