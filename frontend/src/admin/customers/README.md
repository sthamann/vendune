# admin/customers

Customer directory and account/address editing through merchant APIs.

Files and their individual responsibilities are listed in [the generated source inventory](../../../../docs/module-inventory.md). Each file starts with its contract summary.

## Modules

- [`CustomersManager.tsx`](CustomersManager.tsx): CRM list and editable customer profile with linked order history.

## Verification

Run `npm run build`, `npm test`, `npm run test:coverage` and `npm run architecture` from `frontend/`. Coverage includes untested source files; a module in this folder is not automatically fully tested. See the root [testing guide](../../../../docs/testing.md) for backend integration and coverage limits.

`CustomerCreate.tsx` creates a native CRM profile with atomic default addresses and a stable request key; it issues no credentials. The shared native customer picker is used by both manual orders and B2B. [Guide](../../../../docs/admin-workflows.md).
