# App tutorial capture inventory — 12 October 2026

Unretouched Chrome browser captures from the real local seLLM workbench.
Frontend/core implementation: `10fa6bd727b14e416b7d406aa30e9cb8f4918ebb` source,
with identical production code to the package-ownership update. The English
interface runs with a synthetic merchant and a private staging environment.
Images are JPEG bytes with `.jpg` filenames; no generated UI, annotations,
post-processing, provider credentials or real customer data are included.

| File | Visible step | What it proves / excludes |
| --- | --- | --- |
| [assistant.jpg](assistant.jpg) | Three patterns and nine assistants | Actual selectable starting points |
| [product-advisor.jpg](product-advisor.jpg) | Product advisor design canvas | Passive sample layout, not saved product advice |
| [product-access.jpg](product-access.jpg) | Product advice access/surface configuration | Explicit public read and private saving |
| [returns-model.jpg](returns-model.jpg) | Returns schema and order reference | App-owned fields; no refund implementation |
| [customer-assistant.jpg](customer-assistant.jpg) | Customer placement assistant | Actual input/setup before creating the draft |
| [customer-model.jpg](customer-model.jpg) | Customer-bound private schema | Required reference and translatable fields |
| [customer-choices.jpg](customer-choices.jpg) | Stable Standard/Priority choice values | One selected-language editor |
| [scheduled-assistant.jpg](scheduled-assistant.jpg) | Daily shop review setup | 08:00 UTC configuration, not a due tick |
| [scheduled-connections.jpg](scheduled-connections.jpg) | Emit event and active draft schedule | Native schedule contract, not external delivery |
| [erp-connections.jpg](erp-connections.jpg) | Order event, filters and batching | Editable contract, not a connected ERP |
| [coding-agent.jpg](coding-agent.jpg) | Task prompt, provider selector and JSON import | Shared editing path; no model call made for this capture |
| [versions.jpg](versions.jpg) | Existing immutable versions and staging review | Saved local versions; no public release claimed |

The accompanying tutorials include expected results, denied cases and mapped
real HTTP/PostgreSQL suites. The `app_assistants` suite uses isolated accounts,
local service fixtures and actual clock/restart checks; its provider outcomes
remain local. [Start the five workshops](../../app-tutorials/README.md).
