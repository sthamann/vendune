# Production review

A declarative reference app: quality review in native orders and technical review
in native buyer RFQs. The canonical [manifest](manifest.json) contains all app-owned
state names, buttons and rules. No files are copied into the Core at installation.

Install a reviewed version in a private shop first. Create a fresh order, start
processing, enter Quality review, deliver the native shipment, then complete with
the additional `documents.read` right. In RFQs, review the buyer request and return
to the native merchant offer operation. Native financial checks remain authoritative.

The registered host suite `scripts/native_lifecycles.py` exercises this package
through real HTTP/PostgreSQL, MCP and selected sandbox publication. The package
does not call a production payment, email, shipping or manufacturing provider.
See [the integrated workflow guide](../../../docs/app-native-lifecycles.md).
