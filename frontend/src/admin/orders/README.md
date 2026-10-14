# admin/orders

Order directory, detail, state-machine transitions, payment/delivery operations and document generation. Components use shared API commands; state effects come from server events.

Files and their individual responsibilities are listed in [the generated source inventory](../../../../docs/module-inventory.md). Each file starts with its contract summary.

## Modules

- [`OrderDetail.tsx`](OrderDetail.tsx): Order workspace: server actions, exact-once commands, provider progress and visible event history.
- [`OrderPaymentDelivery.tsx`](OrderPaymentDelivery.tsx): Payment jobs are observed until confirmation. Delivery actions share the server state machine.
- [`OrderWorkflow.tsx`](OrderWorkflow.tsx): Server-owned transitions: one source for permitted actions, labels and business guards.
- [`OrdersManager.tsx`](OrdersManager.tsx): Order operations UI. All changes call the same domain endpoints exposed through MCP.
- [`ReceiptPanel.tsx`](ReceiptPanel.tsx): Seller configuration and version-bound receipt creation/download.
- [`ShipmentSplit.tsx`](ShipmentSplit.tsx): Server-admitted package quantity editor with explicit subset validation and parent command fencing.
- [`shipments.css`](shipments.css): Responsive package rows and quantity form using the Studio theme.

See [shipping workflows](../../../../docs/shipping-workflows.md) for native API/MCP,
event, fiscal-snapshot and direct-carrier boundaries.

## Verification

Run `npm run build`, `npm test`, `npm run test:coverage` and `npm run architecture` from `frontend/`. Coverage includes untested source files; a module in this folder is not automatically fully tested. See the root [testing guide](../../../../docs/testing.md) for backend integration and coverage limits.

`OrderCreate.tsx` composes the editable order form, `useOrderCreation.ts` owns admitted context/async selection/draft review, `OrderProductPicker.tsx` searches bounded native products and `OrderReview.tsx` presents exact server totals and explicit completion. They call the native cart/checkout adapter; operational orders remain excluded from configuration releases. [Guide](../../../../docs/admin-workflows.md).
