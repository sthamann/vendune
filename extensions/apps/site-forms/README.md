# Forms inbox app

Public `submit` is append-only, requires a valid native cart, validates answers
against the published page's declared form, and emits a minimized app event in the
same transaction. Inbox reads require current `customers.read` and `customers.pii`.
There is no public inbox read, record ID override or update operation. Existing
app quotas, forced RLS, Flow/event delivery and package fences remain authoritative.
The renderer depends only on the host form contract, not another app's source.
