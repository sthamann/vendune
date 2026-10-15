# Changelog

## Preview-first shop design — 15 October 2026

- Show the existing native storefront immediately and select saved home pages automatically; remove the blank new-page prerequisite and oversized introductory layout.
- Use shared native header/hero/product/footer views in an isolated responsive canvas, with contextual properties, on-demand page navigation and persistent save controls. The design preview starts no cart, checkout, tracking or AI session.
- Open publication review in the actual editor sandbox; keep native app saves/history/release, fork inherited home pages only on edit, preserve actual locale text and product-media selection, and correct the rich editor's language-code-as-prose fallback.
- Keep session-bound merchant previews on their shared origin instead of redirecting away from the host-bound cookie. Add app-owned UI regressions and channel/locale transport checks.

## Hosted runtime separation — 15 October 2026

- Switch hosted Core `5e4c18b` to a restricted, non-owner PostgreSQL login with mandatory RLS, separate runtime/listener connections, migration-only owner access and disabled bootstrap authentication.
- Preserve the existing platform encryption key when splitting secret groups; remove the temporary diagnostic job from the new Core-only secrets.
- Verify actual runtime flags and database identity, direct SQL tenant denials, personal sign-in, native shop provisioning, simulated checkout, stock/cart effects, Admin order/customer projection and completed default order Flow. Paid provider settlement and exhaustive security/failover checks remain separate.
- Document managed database administrator/table-owner separation and the hosted transition checklist.

## Personal workspace and visual standard-shop design — 15 October 2026

- Personal, revisioned work areas with role-aware presets, movable cards, safe pinned grid filters, goals and existing proposal review. Goal-to-Flow creates an inactive native draft.
- App-owned standard storefront editor with one preview/published renderer, localized Tiptap sections, products, theme inheritance, pages, articles and forms; original private Storyfront stays original.
- Public app publication projections enforce channel, status and start time. Private append-only form intake validates the published definition and native cart, then uses existing outbox/Flows; responses require customer PII rights and never become release units.
- Shared bounded app-record history with original read scopes, actor/source, CAS restore and current-field projection. Package-before-record fences protect concurrent saves/releases.
- Central inference prepares source-aware design alternatives as existing review tasks; explicit sandbox approval, revision checks, reference egress/image bounds and enforced style/content/structure selections.
- Native PostgreSQL, synthetic-model, browser and frontend regression evidence and illustrated tutorial added. Real providers, production settlement and whole-business autonomous goal completion are not certified by these fixtures.

## Channel and Storyfront setup — 15 October 2026

- Type-first responsive channel cards, relevant visibility fields, inline validation,
  readable review and an explicit post-save next step; shared localized content fields.
- Marketplace Studio opens inside the current workspace, uses native app consent and
  preselects the originating channel. Installed-app deep links no longer open the library.
- Storyfront self-service connects an existing Core shop/channel through the private
  Experience service and original Studio; current rights, enabled languages, revisions,
  durable retries and publication admission remain explicit. No duplicate commerce shop.
- Illustrated setup guide and local browser/HTTP/queue regression boundaries documented.


## 14 October 2026 — coherent settings and native Admin creation

- Group and search shop settings by foundations, markets/pricing, checkout/fulfillment and customers/business; keep domain-specific shortcuts permission-aware.
- Repair currency card padding, scope/language toolbar, responsive navigation and catalogue-job permission visibility. Load translated-field and language-picker styles from their shared owners so direct editor entry looks the same as navigation through settings. Give shared B2B customer pickers the complete form width, separate name/email and remove default fieldset frames.
- Create CRM profiles and default billing/shipping addresses atomically through native Rust owners, with history/outbox and idempotent retries; no customer credentials are issued. Keep auto-filled address company names complete while preserving explicitly different recipient data.
- Build actor-private manual-order quotes from bounded customer/product lookup, addresses, channel language/currency and native coupon/method pricing. Explicit review binds the exact total and revision before shared checkout.
- Enforce final manual/simulated payment mode under native locks, preserve original customer binding, block stolen private tokens from checkout/logout/downloads and serialize settings/channel/customer/cart changes and same-customer orders.
- Document configuration gaps and the financial/operational sandbox boundary; add real API/MCP/PostgreSQL and UI regressions plus an extracted small admin-payment admission proof.

## 14 October 2026 — hosted AI/source catalogue onboarding

The separately deployed hosted SaaS wizard now offers a reviewed initial AI or
URL-imported catalogue alongside empty and sample shops. Shared preview/approval,
translation, native import and optional media jobs keep commerce data in Rust;
ordinary creation does not initialize Storyfront. Document limits, ownership,
retry checkpoints, explicit native money/stock and actual fixture proof boundaries.


## AI-first website and connected handbook — 14 October 2026

- Add seven ordered handbook paths, chapter/outline navigation and ranked search over every published Markdown source.
- Keep Markdown and the existing verified Pages publisher authoritative; the website consumes that public publication through its isolated apex-only facade.
- Localize handbook interface and reading-path descriptions in English, German, French and Spanish; retain and label original English technical articles.
- Refresh README screenshots from the actual blue Veyndo UI and explain the synthetic/local-model capture boundary.

## Unreleased — EDI identity and hosted RLS evidence

- EDI exports fingerprint the actual serialized document and native source identifiers; operational notes no longer change an identical export's identity. The regression uses the existing native order-note API, and the implementation stays app-owned.
- The 14 October read-only audit found no mandatory RLS switch or separate hosted runtime credential. The authorized 15 October hosted transition closes that dated gap; see the entry above for its targeted live verification and limits.

## First visitor and contributor entry — 14 October 2026

- Add one connected first tour, an agent workshop and a scoped public roadmap.
- Add an isolated loopback-only container tour without a local Rust/Node toolchain.
- Publish the existing Rust image from protected main after the required PR verification and an actual container/HTTP smoke check; preserve immutable source tags.
- Make actual recordings and first contribution tasks visible from the README and docs homepage.
- Add first-tour feedback and a private local GitHub traffic snapshot tool.

## Historical customer ownership — 14 October 2026

- Remove email-only account ownership for old guest orders. Account history,
  issued PDFs and paid download consumers share the native immutable customer-ID
  predicate; a newly registered email cannot claim historical guest purchases.
- Preserve admitted CRM lookup and exact original cart-token paid downloads.
  Do not guess legacy identities or rewrite old financial snapshots.
- Add real failing-before/passing-after registration/order cases and actual
  historical paid-file/PDF denial, guest-capability and merchant-access regressions
  in the existing isolated suite registry. Keep SQL safety and partial proof limits.
- Prevent a typed guest email from forging verified-purchase badges or reserving
  another buyer's review identity. Review-count rules consume stable account
  submissions; append-only migration 093 withdraws unverifiable historical
  email-derived badges while retaining text, rating and moderation.

## Repeated cross-component audit and history discovery — 14 October 2026

- Align advertised MCP history tools with the native entity read/write/PII
  conjunctions. Write-only roles no longer see unusable restore commands and
  PII-denied customer/order/B2B readers no longer see private history operations.
  Actual snapshot access remains guarded by its existing native owner.
- Share the canonical history entity registry and PII classification with the
  schema and invocation. Add failing-before/passing-after narrow-role HTTP/MCP
  counterexamples without another identity, history or release subsystem.
- Refresh the complete component and version/sandbox status matrix, 49 isolated
  suite checks, private Experience's 230-test check and explicit open boundaries.
- Correct the documented integration registry to 85 suites; distinguish provider
  fixtures, build warnings, selected proofs and source tests from hosted acceptance.
- Give the anonymous hosting verifier bounded diagnostics for non-JSON/wrong-status
  replies. Preserve failure rather than claiming an edge denial proves native
  application admission; add actual failure-preservation tooling regressions.
- Correct the registration probe to reach the native closed-signup policy with
  the proper DTO shape but deliberately invalid email/empty password, preserving
  its inability to create a shop. The public anonymous smoke check passes.

## Shared agentic Studio grids — 14 October 2026

- Replace fixed order/product/customer lists with one configurable grid: draggable
  and keyboard-orderable columns, visibility, density, server search/filter/sort
  and stable cursor pages. Preserve criteria through native detail navigation.
- Add reviewed natural-language filter planning via the central model and the same
  HTTP/MCP contract, with current domain/PII rights and replica-wide admission.
- Reuse the visual shell in declarative app tables, preserving native write forms.
- Add real isolated Store API/PostgreSQL/model wire regressions and translated controls.
- Support strict OpenAI nullable optional fields through the same validated planner;
  preserve false-valued filters and reject unknown null identity fields. Verify
  real HTTP/MCP provider response handling across a native restart.
- Add illustrated usage/ownership documentation, touch-safe popovers, false-valued
  filter chips and an always-accessible details action when the main column is hidden.

## System consistency and narrow-role boundaries — 14 October 2026

- Use knowledge scopes for source-document stage diffs/publication, protecting
  private source changes from catalog-only readers and enabling knowledge-only editors.
- Align automation import HTTP rights and MCP discovery with native scopes;
  write-only roles need no unrelated reads and channel roles cannot invoke rule writes.
- Add real HTTP/MCP/PostgreSQL regressions and an audit separating connected
  foundations from incomplete history, Storyfront, AI and release scope.
- Correct outdated group, event, scope, SKU/SEO and shipping documentation.
## Shopware-blue Veyndo identity — 14 October 2026

- Replace the lime logo/favicon/README artwork with #189EFF and share one blue UI palette.
- Apply readable blue actions and cool neutral light/dark themes across Studio, customer account, storefront and operator console; remove duplicated Studio palette overrides.
- Keep canonical vector copies synchronized and document the central token owner.
- Make the order workflow card use those theme tokens too, preserving readable
  status, cancellation and action text in dark Studio.

## Partial packages and provider-neutral shipping apps — 14 October 2026

- Split open physical packages through one native HTTP/MCP operation with current
  rights, tenant scope, order revision, stable replay and a shared fulfillment guard.
  Conserve line quantities, immutable price/taxes and stock; order completion waits
  for all packages. Delivery notes print only the selected package.
- Reuse private order receipts for immutable carrier PDFs, aggregate app quotas,
  customer-owned return downloads, tracking, activity and document/split Flow events.
- Freeze native package intent before an external effect. Unknown outcomes block
  allocation, dispatch and cross-provider substitution across process restart.
- Add specific delivery/document callback consent and own-job status reads without
  leaking inputs or leases. Manager lists redact results after action-right loss.
- Connect order-bound Flow actions to current personal identity and stable job keys;
  update the shipping App Studio assistant/example to this same generic contract.
- Keep provider protocols, credentials and UI in their app packages. This release
  deliberately ships no carrier adapter. Local fixtures verify the actual native
  job/PDF/tracking/Flow path without paid bookings or external credentials.
  [Usage, ownership, configuration and limits](docs/shipping-workflows.md).

## Personal account security — 14 October 2026

- Add native authenticator enrollment, expiring bounded challenges, replay-safe TOTP,
  one-use recovery codes and immediate personal-session/handoff revocation.
- Keep verified email recovery, credential revisions, private Experience continuations,
  operator/merchant sign-in and new-shop creation behind the same factor admission.
- Recheck private Experience cookies against native proof; refresh retry proof before
  brand/model work. Recover interrupted Studio handoffs without repeating credential changes.
- Keep credentials outside sandbox/release/history restoration. Use existing encrypted
  state and outbox for secret-free security-change events; extend selected Lean admission
  coverage without claiming cryptography, SQL or provider correctness is proved.
- [Configuration, source ownership and synthetic end-to-end tests](docs/account-security.md).

## Studio setup and reusable roles — 13 October 2026

- Fix POS/marketplace wizard validation across interface and content languages. New channels start in the shop main language; missing fields have targeted errors and accessible invalid states.
- Add an explicit App Studio overview return that retains the current draft and closes private previews.
- Persist localized tenant roles with standard defaults, CAS/history, immutable owner authority, reference-checked custom deletion and immediately current session/key/worker grants. Team delegation and acceptance serialize with role changes; retained overrides also require current delegation authority.
- Add domain scopes and shared readable permission selectors. Filter Studio navigation, direct workspaces and startup data; preserve normal reauthentication drafts. Protect full CRM/order/history/PDF data with the separate PII grant, and redact arbitrary Flow results for limited readers.
- Add central versioned B2B feature settings, an explanatory module landing, atomic guided company/unit/customer creation and bounded indexed customer search.
- Add real PostgreSQL concurrent-demotion, privacy, MCP and rollback tests, plus visible wizard, role-editor, App Studio return and limited-navigation regressions. [Usage, ownership and limits](docs/studio-access-and-setup.md).

## UCP B2B offer negotiation — 13 October 2026

- Advertise the versioned Veyndo B2B negotiation extension alongside UCP checkout, with a namespace-bound composed schema and configured hosted endpoint.
- Route buyer RFQs, counterproposal messages, original-cart offer acceptance/release and purchasing approval requests to existing B2B owners; retain the merchant Studio quote inbox, APIs, MCP, history and transactional Flow events.
- Select exact platform capability versions through bounded public HTTPS profiles, or an explicit vendor client shortcut. Profile compatibility never grants identity; current customer/unit permissions, foreign-object denial, CAS, expiry, budgets and final checkout guards remain native.
- Expose current purchasing blockers, original-cart quote reads, scoped continuation/order URLs and terminal quote state. Add real PostgreSQL/UCP purchase and denial regressions; preserve the selected-protocol and simulated-payment boundaries.
- Document the sequence, native operations, extension version and ownership; regenerate the Developer API catalogue and complete rendered source inventory.


## New feature video tours — 13 October 2026

- Add three silent 1080p tours with English captions: POS/shared orders/B2B, visual apps/working preview/Flow canvas/selected release, and marketplace content/consented visitor statistics/semantic journeys.
- Add an on-demand chapter gallery to the public website, linked README posters and complete transcripts/capture boundaries. Preserve the six existing workflow clips and original Experience/SaaS tours.
- Extend the existing player for independent tab groups, one active video and chapter seeking; verify complete rendered documentation, media hashes and caption timing. [Tours and provenance](docs/video-tours.md).

## MCP dispatcher stack repair — 13 October 2026

- Reproduce a real worker-stack overflow in Linux coverage CI on `pos.cart`. Select and return only the chosen boxed domain future before polling it; inactive domain futures no longer inflate the shared asynchronous dispatcher frame.
- Retain native permission checks and HTTP/MCP/agent contracts. Real POS and B2B PostgreSQL suites pass with a 1.5 MiB worker stack locally, without increasing the production stack limit. Coverage CI remains the release gate; future-size inspection alone did not detect this poll-frame failure.

## Connected feature audit and repairs — 12 October 2026

- Require each selected release unit's native rights; validate current Flow action permissions and rebind its publishing actor. Share native channel validation and initialize selected POS cash/pickup defaults.
- Reject direct analytics capture from staging/preview. Add inherited versioned enable/retention/intake settings, current-consent disclosure and matching report/Storefront admission.
- Expose B2B entity history over the shared MCP schema and company/unit Studio controls. Restore configuration with current revision and native allocation/hierarchy validation; financial history remains inspection-only.
- Clone/publish selected B2B company/unit policies and catalog selection through shared transactional writers, preserving live employees/spending and denying hidden/unauthorized changes.
- Include B2B method/currency dependencies and monetary-storage guards in existing configuration/release owners. Add actual PostgreSQL/HTTP and UI regressions; no new commerce ledger or plugin source relocation.
- Refresh owner documentation, README and complete rendered documentation. [Audit matrix and boundaries](docs/feature-integration.md).

## Visitor behavior intelligence — 12 October 2026

- Native consent-bound guest/customer observations reuse the PostgreSQL event ledger, authenticated identity and native orders; no parallel analytics service or tracker identity.
- Channel/window reports, coarse browser/device/language/referrer and separate visitor/destination countries connect to current semantic product relationships. Studio provides charts, linked graph and permission-gated timelines in EN/DE/FR/ES.
- HTTP and MCP share report/PII permissions; repeated events, cross-shop IDs, forged customer/purchase events, consent withdrawal, bounded intake and expiration are tested. Trusted geography remains an optional operator-configured ingress.
- Native storefront capture is included; headless/Storyfront adapters must explicitly adopt the consent-bound contract. No automatic model training or causal conversion claim. [Guide](docs/behavior-intelligence.md).

## Marketplace channels and independent Rust app — 12 October 2026

- Add a private integration channel type, native tenant-scoped product/channel projections and authorized paid-order intake. Reuse exact minor currency amounts, native guest customer snapshots, stock allocation, order history, outbox and invoice/PDF owners.
- Add app-owned Amazon Listings Items/current Orders 2026 API, eBay inventory/offer reconciliation and Kaufland signed product/unit/order-detail adapters. Preserve stable SKU identities and paginated retrieval.
- Add multilingual connection, offer, mapping-preview and structured source-order review UI. Per-offer translated contents, media, prices, category policies and explicit data-only attributes inherit from one native catalogue.
- Reuse current-consent app callbacks and native leased jobs; add bounded external responses, heartbeat, CAS transmission uncertainty fences, actor rights and no blind listing retries.
- Add a non-root Rust-only service image, operator setup, native App Studio sales-channel references, API/MCP/Flow action contracts and registered local-provider/PostgreSQL/UI regressions.
- This is not live seller certification, automatic full-catalogue stock propagation or complete marketplace accounting/fulfillment/refund synchronization; prerequisites and remaining scope are explicit in the marketplace guide.

## Focused cashier workspace — 12 October 2026

- Add dedicated register/fullscreen controls, bounded product/customer search, customer-number card scanning, visible addition feedback and native customer-price rendering.
- Add revision/actor/current-PII-bound customer selection with shared billing/group repricing; stale/deactivated identities are rejected at settlement.
- Add reasoned percentage/fixed cashier adjustments through the native tax allocator in both quote and commit, transactional audit and pre-order Flow events.
- Add read-only advice through the existing merchant chat and safely escaped 58/80 mm print layouts from issued immutable invoices. No physical printer, terminal, loyalty wallet or fiscal certification is claimed.
- Reject malformed scalar/array discount bodies with 400 before trusted-actor injection; preserve the authoritative cart and server process.
- Fix duplicate customer/discount controls after parking and resuming a cart; add a multi-cart regression and keep tender/completion visible while tools scroll.
- Fix stack exhaustion found in real MCP POS calls by bounding domain futures; preserve existing checkout replay fingerprints when the new optional fields are absent.
- Add isolated PostgreSQL/current-role/foreign-tenant, discount/commit/document/Flow tests, cashier UI regressions and one scoped extracted Lean guard.

## B2B creation and purchase acceptance — 12 October 2026

- Fix company and purchasing-unit reference generation: digit-led UUIDs no longer produce an ID rejected by the native organization API. One shared factory preserves the lowercase-first-letter, 32-character contract.
- Exercise both complete editor creation request paths with a digit-led UUID and the native identifier rule. All 447 frontend tests in 81 files pass.
- Forward the current tenant-scoped customer session on the final checkout command through the same shared identity helper as the Store API. This closes an actual browser-observed B2B purchase rejection without weakening server approval or identity checks. Guest/logout and foreign-tenant sessions have regressions.
- Request approval after native checkout review, refresh it without rewriting the cart and block purchase while approval is pending or the unit budget is exceeded. Changed totals/revisions invalidate review; direct form submission cannot bypass it. A complete local buyer/approver browser run saved RAC-f0646e6d (134.83 EUR), consumed the approval, allocated budget once and retained Bag 0 after reload.
- Publish an actual hosted company/unit capture after saving, reloading and reopening currency, budget, approval threshold, cost center and required purchase-order policy. This does not claim external EDI transport or a real payment.

## Modular B2B and independent EDI — 12 October 2026

- Add tenant-bound companies, unit hierarchy, current employee grants, private catalogs, exact-currency period budgets and original-quote purchase approvals.
- Add SKU quick order, owned/shared lists, RFQ negotiation, original-cart offers, unit order history and shared invoice/PDF access. Reuse native currency/tax, checkout, stock, payment, audit and outbox owners.
- Integrate Studio/account UI, content-language inheritance, private app references/surfaces, API/MCP and ten Flow events; extend the shared coding-agent schema and App Studio recipe picker.
- Keep EDIFACT/UBL/cXML codecs, partner mappings, native requisition import and immutable document export in an independent Rust app package. No second pricing, order or queue owner.
- Fix capability-dispatch stack exhaustion exposed by the POS/MCP regression; box new domain futures without increasing worker stack limits.
- Add native HTTP/PostgreSQL/tenant and app/gateway restart regressions, UI cases and two scoped Lean policies. Advanced B2B chains, partner-profile certification and network transports remain open, explicitly documented.

- Complete App Studio action/surface permission choices for B2B, POS and customer PII; test against the central native registry and preserve restrictive action allowlists.

## Native POS channel — 12 October 2026

- Add authenticated, cashier-bound POS channels and touch/scanner register UI, native variants, parked carts, currencies and coupons.
- Reuse atomic checkout, stock, orders, customer snapshots, shared payment-provider onboarding/jobs and immutable invoice/PDF owners. Cash tender/change use reviewed integer currency units; pending provider attempts remain pending until confirmed.
- Emit transactional POS events through existing Flow/app workers; expose private catalog/cart/receipt app surfaces to the same visual/coding-agent contract and POS tools to MCP.
- Recheck pause/location, role and cart ownership; deny public and generic-MCP bypasses. Add real PostgreSQL/provider regression cases and a scoped Lean cash policy.
- Document setup, architecture, ownership, permissions and limits. Offline sales, terminals, shift accounting and fiscal certification remain outside this release.

## App lifecycle, reference services and Experience admission — 12 October 2026

- Fix transient Studio login errors during loading while retaining conversation drafts.
- Filter selected-app versions, reconnect exact restored builds and allocate unused patch versions.
- Deduplicate validated native Save controls; support named order cases and confirmed status transitions. Hydrate standalone inputs before interaction and refresh the shared app registry with the workspace.
- Add generic app-owned workflow declarations with transactional immutable fields and current-package fencing.
- Share process/tenant/app network admission across actions, events, UI bundles and payment adapters; bound opaque guest bridge concurrency and stale completions.
- Complete the Returns lifecycle and an independent Rust ERP reference adapter with app-only forced-RLS receipts, signed intake, deduplication, cold restart and explicit uncertainty reconciliation.
- Project order callbacks from immutable integer currency/scale totals and native line items.
- Companion private Experience release normalizes reference URLs, validates all saved wizard steps before quota admission and returns structured localized errors with Retry-After. Public creation reached the original Storyfront Studio on 12 October; no new images or real charge were used.
- Refresh workshops, package deployment guides and trust boundaries. This does not establish whole-system proof, full coverage, every ERP integration or live payment-provider settlement.

## Illustrated app workshops — 12 October 2026

- Add five step-by-step tutorials: product advisor, private returns workspace,
  customer preferences, scheduled review flow and ERP handoff.
- Include twelve unretouched English browser captures, exact input values,
  coding-agent prompts, permission reviews, expected/denied cases and the shared
  private preview → immutable version → staging → selective release workflow.
- Keep examples linked to existing app-owned packages/assistants; no second
  runtime, service queue or core app implementation is introduced.
- Refresh README, feature/editor/reference guides, release inventories, homepage
  entry and machine-readable documentation links. Preserve dated evidence and
  explicitly distinguish native previews from live external integrations.

## 2026-10-12 — App-owned packages and readable designer

- Move editable returns/advisor/ERP patterns to ordinary plugin manifests.
- Keep Email/Google Analytics/Gmail/Slack business modules in their app folders;
  compile shared connector hosting only in its separate binary.
- Keep Storyfront bridge UI/styles/translations and GA storefront tracking in their
  app folders; include them in architecture, localization and coverage checks.
- Group the legacy PayPal adapter with its package; preserve existing payment and
  webhook behavior and explicitly retain its host-native compatibility boundary.
- Show passive translated table/form/control previews, semantic toolbox icons and
  distinct navigation icons, retaining selection, geometry and F4/F5 behavior.
- Document all-app ownership and prevent known source leakage in the CI structure gate.


## Connected workbench — 12 October 2026

- Standalone native inputs edit a unique form for the same model and record; ambiguous/unrelated bindings and protected references do not join. Typing remains local until the validated Save action runs.
- Native runtime raster rows grow to fit editor content instead of hiding short controls behind internal card scrolling; tables retain bounded scrolling.
- Native input controls reload persisted values on explicit refresh and clear stale record values; typing still makes no write.
- AI edits target the existing Manifest through bounded JSON Patch; host-assigned versions, atomic application, no-op rejection and unchanged schema/access guards replace whole-app regeneration. A real local Qwen task produced translated, order-bound controls; broader model quality remains unbenchmarked.

- Add editable Product advisor, Returns workspace and ERP handoff patterns to the existing visual App Studio.
- Preserve host-object filters when adding or rebinding visual data controls; missing context prevents unfiltered requests. The actual order-bound case save is browser-verified.
- Review model proposals and coding-agent imports before replacing the canvas; stale drafts/environment changes prevent acceptance.
- Expand native generation controls and the local app output ceiling; retain existing storage/access/service/event contracts.
- Route approved whole-catalogue translation proposals into the existing durable draft queue, with a direct review link and idempotent replay.
- Explain consent-bound personalization and prevent cross-shop/cart state or delayed-response reuse.
- Companion private changes checkpoint completed imports and protect payment referral replay/disconnect state.
- [Architecture, usage, tests and precise remaining boundaries](docs/connected-workbench.md). Local fixtures are not live-provider or hosted acceptance.

## Storyfront connection consent — 2026-10-09

- Fixed the Storyfront workspace's Add integration button: it now uses the same
  package-permission review as Apps rather than sending an unapproved installation
  that the core correctly rejected. Successful installation or activation refreshes
  the shared app-surface registry immediately.
- Installation errors remain in the review dialog for retry. Activation errors keep
  the existing control available. Installed connectors without a configured service
  explain the missing setup in English, German, French and Spanish instead of
  repeatedly offering installation. Managed Experience discovery stays unchanged.
- Added regressions for complete consent, cancellation, rejected installation,
  revision-based reactivation, read-only access and workspace switching.

## Checkout continuity — 2026-10-09

- Public mobile acceptance: RAC-faa7dde0 / 44.80 EUR, German saved product name,
  cancellation preserving the original Bag and confirmed Bag 0 after reload.
- Refresh public release documentation and actual embedded-checkout/Studio screenshots.
- Return native checkout close/Escape cancellation to its registered Experience parent;
  keep ordinary checkout local and preserve the cart on cancellation.

- Reuse the native checkout inside registered Storyfront shop domains.
- Save localized parent/variant product labels in immutable order snapshots.
- Send shopper-only completion receipts for server-verified original bag reconciliation.
- Add actual PostgreSQL origin/isolation and localized order regression checks.
- Companion private integration adds recognized-account sign out and localized original Studio overview states.
- Real payment redirect/3DS acceptance remains separate from simulated checkout tests.

## Original public Storyfront acceptance — 9 October 2026

- Replace the reduced hosted Experience editor with the original private Storyfront Studio, Cinematic renderer and workers on the existing Experience service. Keep private source and provider credentials out of public Veyndo.
- Record a fresh AI demo catalog with three generated product images, original review/build/Go live, persisted brand edits, a real German product-answer scene and a 390px responsive check.
- Verify original Bag → canonical checkout → saved simulated order RAC-4aed0976 (54.70 EUR). Return-to-shop uses canonical hosted navigation instead of retaining the standard SPA; local navigation remains unchanged.
- Document canonical Core ownership, mounted public API admission, one-use checkout handoff, source pins and actual browser screenshots. Preserve dated legacy observations and explicit upstream localization, provider and production-capacity limits.

## Native Experience checkout destination — 9 October 2026

- Keep one-use checkout transfers on the shared Core `/checkout` page through cart consumption, payment and receipt. Canonical shop redirects previously sent the transferred customer back into a mounted Storyfront instead of opening checkout.
- Preserve existing tenant/channel scope, ticket expiry, single-use consumption and cart-token rotation. Legacy transfer URLs remain supported; ordinary product URLs still upgrade to their shop subdomain.
- Exercise the actual HTML entry and PostgreSQL handoff in the existing integration suite, plus frontend redirect regressions. This routing repair does not implement or validate a live payment provider.

## Hosted public frontend API routing — 9 October 2026

- Delegate the reserved `/api/v1/...` public frontend namespace only on an operator-mounted shop hostname. Original hosted Storyfront commerce/session APIs previously returned an unregistered-Core-API 403 before reaching their renderer.
- Preserve central tenant/channel, paused-shop, private-preview and resource admission; registered Core routes and merchant credentials remain isolated. Real HTTP/PostgreSQL regressions exercise GET/POST bodies, query strings, forged scope, unmounted hosts, paused shops and read-only private previews.

## Native Storyfront release packaging — 9 October 2026

- Fix the production image build: historical app manifests used by the canonical upgrade/approval contract are now copied into the Rust build stage. They are existing reference inputs, not a restored Python runtime or a second app registry.
- Add a CI dependency-closure check for literal Rust compile-time includes, with a negative control reproducing the eight missing manifests from the failed public build.
- The older publicly deployed Core lacked the confirmed-claim intake/compile endpoints required by the private original Storyfront adapter. Update the tested Core through the existing backup/migration/release workflow before claiming native public integration.

## Connected intelligence, app ontology and acceptance — 9 October 2026

- Automatic tenant-bound embedding intake/model rebuilds, pooled Qdrant, lexical/dense fusion, optional reranking and self-hosted OpenAI-compatible serving. Forced-RLS lexeme projections narrow current candidates without bypassing source admission.
- Authorized agent read rounds, native SSE progress, shared AI admission, source-bound reviewed claims, signed public facts and saved fact-based categories. Product answers recheck all supplied sources; buyer advice rechecks channel-visible native facts and explicit preference consent after inference.
- Price guardrails/daily autonomy budgets, fixed-horizon layout experiments and opt-in document-event extraction reuse existing approval, Flow, outbox and knowledge owners. Broader autonomous writes, token streaming and continuous extraction remain open.
- Optional app-owned ontology maps share one visual/coding-agent manifest and current API/MCP/planner grants. Added the multilingual ontology-care example. No parallel app knowledge database.
- Private Experience pins this merged Core and consumes confirmed public claims through the original Storyfront compiler; original native worker/provider and free-prose binding gaps remain separate.
- Refresh README, release/testing/formal guides and public site; publish exact formal/coverage evidence and a detailed acceptance record. Correct stale core-RLS and module/suite-count descriptions.
- Fix merchant-registration slug validation for modern browsers; add valid/invalid slug regression coverage. Repeat the full original Storyfront suite and actual product history/app publish journeys.
- Fix the real mail/Flow regression fixture to honor the existing native PostgreSQL selector instead of hard-coding Docker; the same fixture retains Docker CI support.

[Detailed changes, tests and limitations](docs/release-acceptance-2026-10-09.md). Historical recordings and performance measurements keep their original source/date.

## Request hotpath and delivery — 8 October 2026

- Reuse one fresh server-owned domain/tenant/staging/status/channel snapshot per request, with current personal credentials and immutable hosted mount binding. No status or permission TTL cache.
- Remove native public-asset identity SQL; ship deterministic gzip/Brotli build variants and secret-free API compression with correct negotiation, ranges and stream exclusions. Hosted/private assets retain admission.
- Borrow decoded settings through immutable Arc handles; batch inventory deduction/allocation/release using persisted quantities and sorted locks.
- Consolidate dashboard facts and bound parallel reads to three branches. Historical currency separation and cancellation idempotence retain their contracts.
- Publish a matched 9,000-request local comparison with zero errors, raw samples and unchanged business fingerprints; no universal speedup or production-capacity claim. See [the measurement and scope](docs/read-performance.md).
- Add two Lean properties for native-asset admission and explicit review locks for embedded SQL/build inputs. SQL, providers and browser behavior remain unproved.

## Rust standard services — 7 October 2026

- Ported bundled Email Delivery, GA4, Gmail, Slack and OAuth/export state to an independent Rust service; existing app, Flow Builder and MCP contracts are preserved.
- Replaced local SQLite with encrypted tenant/app-bound PostgreSQL records, forced RLS, distributed lease-fenced claims and per-tenant/app quotas. Ambiguous external delivery is never automatically resent.
- Added compiler-typed mail configuration, verified SMTP STARTTLS/TLS and Resend/SendGrid delivery, atomic offline migration, actual multi-process/provider regressions and the extracted Lean retry predicate.
- Archived the previous Python implementation as a migration comparison oracle. Python remains in development tools and independent app examples, outside the first-party central runtime. See [the architecture and language audit](docs/rust-services.md).

## Veyndo identity — October 2026

- Renamed the public repository, Rust crate/binary, frontend package, Docker images, MCP identity and documentation to Veyndo.
- Added the original Veyndo V/dune vector mark, light/dark wordmarks, shared Studio/operator branding and favicons.
- Preserve existing shop identities, browser sessions and database volumes; fresh installations use Veyndo names.
- Recaptured current English README views and added a public-brand consistency check.

## Unified content translation editors

- One shared content-language picker and one field per value across product/SEO,
  attachment, category, tax, method, rule/campaign/channel and graphical flow editing.
- Main-language inheritance for simple and graphical flow instructions and file
  titles, dynamic enabled content locales and localized storefront file labels.
- CI rejects new stacked language fields; regression checks cover preservation,
  explicit blanks, Spanish inheritance, Italian and regional variants.
## 0.5.0 — prototype release

This release packages the current experimental commerce slice. It is not a
production-readiness or complete Shopware-compatibility claim.

- Modular Rust commerce core and multilingual storefront/Veyndo Studio.
- Personal users, independent workspaces, invitations and merchant roles.
- SKU variants, quantity prices, review moderation and configurable demo checkout.
- Durable PostgreSQL storage with Apache AGE and pgvector.
- Merchant-approved proposals, local inference and optional cloud adapters.
- Partial MCP/UCP bindings and bounded Wasm B2B purchase policies.
- Original Shopware pricing/context/tax comparisons and first-start policy fix.
- Versioned app examples, shop intelligence, separate worker roles and a PayPal Sandbox adapter.
- Sandbox verification uses local contract fixtures; live Sandbox traffic is unverified.
- Clear commerce-first quickstart, searchable guides and contributor information.

Payments are simulated, manual or Sandbox; no real money is charged. See [the feature matrix](docs/shopware-parity.md),
[verification record](docs/verification.json) and current CI for exact scope.
