# B2B workspace

B2BWorkspace composes company editing, UnitEditor and membership management; UnitCatalog searches native products and UnitMethods inherits translated shipping/payment methods; Quotes edits cart-bound merchant offers. All operations use /api/b2b, optimistic revisions and current role scopes. Shared wire types, styles and vocabularies live under shared/b2b and shared/i18n; buyer UI stays under storefront/account. Unit/order authorities remain in the native Rust owner, not UI calculations.
