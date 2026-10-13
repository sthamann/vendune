# VEYNDO app tutorial capture inventory — 13 October 2026

Unretouched browser captures of the actual local VEYNDO workbench, with synthetic records and a private preview environment. The original rebrand capture set uses source `5b2ebb5`; the new customer, schedule and ERP PNGs use `3cea18a`. JPEG files contain JPEG bytes; current PNG files contain PNG bytes. No generated UI, provider credentials or real customer data are included.

The six new tutorial captures are recorded in [individual provenance](../remaining-veyndo-captures.json). Draft configuration is not app installation, a scheduled tick or external delivery. Earlier acceptance remains in the [archived inventory](https://github.com/sthamann/veyndo/blob/e2eee5f7a1baacd00be3cfbbae97ff4c24522674/docs/assets/app-tutorials/README.md).

| File | Visible step | What it proves / excludes |
| --- | --- | --- |
| [assistant.jpg](assistant.jpg) | Three patterns and nine assistants | Actual selectable starting points |
| [product-advisor.jpg](product-advisor.jpg) | Product advisor design canvas | Passive sample layout, not saved product advice |
| [product-access.jpg](product-access.jpg) | Product advice access/surface configuration | Explicit public read and private saving |
| [returns-model.jpg](returns-model.jpg) | Returns schema and order reference | App-owned fields; no refund implementation |
| [customer-assistant-current.png](customer-assistant-current.png) | Customer placement assistant | Actual input/setup before creating the draft |
| [customer-model-current.png](customer-model-current.png) | Customer-bound private schema | Required reference and translatable fields |
| [customer-choices-current.png](customer-choices-current.png) | Stable Standard/Priority choice values | One selected-language editor |
| [scheduled-assistant-current.png](scheduled-assistant-current.png) | Daily shop review setup | 08:00 UTC configuration, not a due tick |
| [scheduled-connections-current.png](scheduled-connections-current.png) | Emit event and active draft schedule | Native schedule contract, not external delivery |
| [erp-connections-current.png](erp-connections-current.png) | Order event, filters and batching | Editable contract, not a connected ERP |
| [coding-agent.jpg](coding-agent.jpg) | Task prompt, provider selector and JSON import | Shared editing path; no model call made for this capture |
| [versions.jpg](versions.jpg) | Existing immutable versions and staging review | Saved local versions; no public release claimed |

The accompanying tutorials include expected results, denied cases and mapped
real HTTP/PostgreSQL suites. The `app_assistants` suite uses isolated accounts,
local service fixtures and actual clock/restart checks; its provider outcomes
remain local. [Start the five workshops](../../app-tutorials/README.md).
