# Northflank releases and private performance tests

The product and source namespace are VEYNDO. Existing Northflank resource IDs and private DNS names below are retained deployment identifiers; they must not be recreated merely to change the brand. The Git push trigger now points to `sthamann/veyndo` on `main`.

The `vendune-main-release` Northflank workflow listens to pushes to `main` only.
GitHub branch protection requires the complete `verify` check, an up-to-date
branch and pull requests; enforcement applies to administrators as well.
The workflow queues releases, builds the exact triggering SHA, waits for a
PostgreSQL native backup, deploys that exact image to `vendune-migrate`, waits
for its successful migration-only run, then deploys the same image to Core and
waits for readiness. Core's direct CD and the builder's direct CI stay disabled.
A failed backup, build or migration prevents the service deployment.

Direct CD being off does not pause this separate main-release workflow. A manual
feature-branch deployment is temporary and can be replaced by an already queued
main release. Finish the verified merge and verify the final main image before
recording the current public source. Open Studio tabs may still reference an old
content-addressed lazy chunk: the shared boundary explains that load failure and
offers explicit version reload, preserving ordinary unsaved-change checks.

`vendune-migrate` runs `/app/veyndo` with `BOOTSTRAP_MODE=migrate`, without
operator credentials or demo seeding. It inherits only the existing private
PostgreSQL URI from `vendune-runtime`. Migration ledger/checksums and the database
migration lock remain authoritative. Do not edit a released migration: add a new
one. Use expand/contract schema changes while the previous version is serving.
A database backup is not automatic rollback: restore is an operator decision,
and backward-incompatible changes require a staged rollout. Release backups are
additional to the daily seven-day retention schedule; manage their retention as
catalog size grows.

The manual `vendune-benchmark` job builds `deploy/Dockerfile.benchmark`. It has
no public port or schedule. Runtime-only database linkage must never be granted
to a build. Set `BENCHMARK_ENVIRONMENT=veyndo-northflank-test` and
`BASE_URL=http://vendune-core:8787`. The bounded job creates fresh synthetic tenant
IDs and retains their fixtures for diagnosis. It never modifies another tenant.
No authentication secrets, customer sessions or connection strings are logged.

`scripts/cloud_benchmark.py` reuses the validated sampler from `benchmark.py`.
It tests 1 shop × 1,000 products, 1 × 100,000, 100 × 1,000 and 1,000 × 100.
Each case measures localized catalog pages, product details, selective and broad
keyword search, at concurrency 1/8/32, twice. Broad search is capped at 64 requests
per sample to bound expensive common-term cases; other samples default to 300.
A fixed-arrival catalog sample
includes client queue time. Cart reads and one simulated persisted checkout are
also validated. Output uses `RESULT_JSON`, `DATABASE_JSON`, `METADATA_JSON` and
`COMPLETE_JSON` lines for result extraction from Northflank job logs.

These are warm-cache private HTTP measurements on the actual small deployment.
They do not measure external TLS/CDN, storefront rendering, SaaS signup, vector
index capacity, paid embeddings/LLM calls or real payment traffic. Shared CPU and
short samples vary; report per-round values and errors, not an extrapolated shop
limit. The tenant fixtures exercise distribution in the current single island;
no automatic island allocator or shop relocation controller is implemented yet.

Common translated terms use ordered, deduplicated candidate IDs before loading
full product rows. Effective field fallback, channel/category filters and cursor
boundaries still apply before the page limit. Candidate scans can still grow with
the number of matching translations; this is not a constant-work search claim.

## Public Studio origin

Set both `COMMERCE_PUBLIC_ORIGIN` and `PUBLIC_BASE_URL` on the runtime service to
`https://app.veyndo.ai`, then update/restart the service. Keep these runtime-only;
no database credential belongs in the builder. The origin guard intentionally
ignores Host/forwarded headers and accepts only the configured Studio origin.
Do not weaken it to repair a 403. No-Origin clients still use ordinary auth checks.

On 6 October 2026 the deployed `fa09350` release (including API-explorer autofill
correction) was verified in Northflank. Updating the old internal code.run origin
restored public browser MCP: allowed origin 200, foreign origin 403. An authenticated
merchant created fresh synthetic shops; on the current loaded Studio the new shop
retained its session immediately. Products, eight discoverable standard apps and
MCP tools/list worked. Reload tabs opened before the release to load its new bundle.
The subsequent `75bd24a` checkout release completed its backup, migration and
readiness workflow. Its public one-page checkout saved synthetic order
`RAC-7cdc9432` with structured address, standard shipping and explicitly simulated
payment (EUR 79.80). No real payment was made.
This check does not certify actual payments or production SaaS security.

## VEYNDO domain cutover — 13 October 2026

Core `ced4a38` and Experience `a6d3472` are running on Northflank. Core's release run `2eebf99a-d4cf-4fe5-ae35-3c984fa5cf49` built the new image, saved the PostgreSQL snapshot and ran migration job `be34855e-c9fa-467d-97be-4f7893d40874` successfully. Old workers were paused for the identity migration and resumed with the new image. Experience automatic deployment was restored after coordinated cutover.

Runtime origins are `https://app.veyndo.ai` and `https://experience.veyndo.ai`; the shop suffix is `veyndo.ai`. The existing Experience identity state is copied through the configured migration adapter without changing tenant identity or replacing collisions. Migration 090 is additive; released migration files and checksums remain authoritative.

[The reviewed frontend-origin transaction](operations/update-hosted-frontend-origins.sql) updates only the three configured, owned previous Experience origins. Run it as an authorized operator with the existing runtime database link, never a build credential. The operator transaction must set the established RLS system context to `on`; `true` does not satisfy that policy. Production execution updated 11 mounts and invalidated 10 tenants, committed and exited successfully. Repeating the transaction makes no additional changes.

Cloudflare manages DNS; United Domains retains registration. The apex redirects to HTTPS `www.veyndo.ai` with path and query preserved. Northflank serves www, team, start, Experience, Studio and wildcard shops. Its certificate was issued after the temporary Universal SSL verification conflict was cleared; Universal SSL is enabled again. Automatic renewal through the overlapping DCV configuration has not yet been demonstrated. Old root/team DNS and Apple callback updates remain pending provider-account access.

The Google callback on `start.veyndo.ai` returned successfully to the existing merchant workspace. [The native-shop URL transaction](operations/update-native-shop-urls.sql) corrected eight stored links whose HTTPS host exactly matched their own tenant under an earlier configured domain. Custom domains, foreign-tenant URLs, Experience renderer bindings and owner identity remain unchanged. Its isolated PostgreSQL check covered those exclusions and idempotence. Run this transaction through the Experience service's existing database connection: its registry lives in a separate database from Core. No provider key is printed or copied. The first Core-database attempt failed before updating any row; the correct Experience transaction committed successfully and a browser reload confirmed the new links.

### Public double-check after the VEYNDO cutover

The final registry pass corrected 11 additional Experience URLs using the [owned shop URL transaction](operations/update-all-owned-shop-urls.sql), including an editor alias sharing a native tenant. It preserves each existing hostname prefix and updates only exact owned legacy URLs. Renderer bindings, channels and custom or foreign domains are retained. Its isolated PostgreSQL check covered shared-tenant aliases, exclusions and idempotence.

Two existing native shops still returned 404 because the original renderer's separate `merchant_hostnames` registry did not yet contain their new hostnames. The [native hostname transaction](operations/add-native-hostnames.sql) added eight aliases through the existing native database connection. It retains legacy aliases, merchant identity and hostname kind, and aborts on ownership collisions. The isolated PostgreSQL check covered successful insertion, rerun idempotence and collision rollback. Run it against the native renderer database, not the Experience registry or Core database.

After those corrections, all 20 inventoried shop addresses returned HTTP 200 on `veyndo.ai`, with no previous product name found in their returned HTML. This is a hostname and response check, not a complete acceptance test of every shop's features. The existing Cobalt native shop additionally passed product collection, add-to-bag and embedded checkout handoff to `app.veyndo.ai`; both temporary carts were emptied afterwards. No order or model call was made in that native test.

A new public migration test shop was created through the authenticated start workspace with example products. Its merchant handoff opened the existing Core administration with 12 products. A synthetic guest checkout saved demo order `RAC-51aa18c2` for EUR 169.00; the order remained present in merchant Orders after reload, and the storefront cart was cleared. Payment was explicitly simulated. The welcome-mail provider accepted the message; inbox receipt was not checked.

![New migration test shop: actual saved demo order](assets/showcase/new-shop-order-current.png)

![Existing native shop: embedded checkout on the new domain](assets/showcase/native-checkout-current.png)

Current screenshots and motion captures are inspected separately from source literals. Old branded stills and unused original recordings are removed from the current tree; dated acceptance evidence remains linked at a verified immutable preceding Git revision. The marketing gallery uses fresh actual captures. OCR is an additional check, not proof that every pixel or every video frame was recognized. Previous names remain deliberately in legacy-domain migration statements and immutable Northflank resource identifiers; Git history is preserved.

The inbox check also identified an old sender in the actual initial welcome mail despite its current subject and body. The domain `veyndo.ai` was authenticated in the existing Brevo account using the provider verification TXT, two DNS-only DKIM CNAMEs and DMARC. The verified sender is `VEYNDO <hello@veyndo.ai>`. A persistent runtime `MAIL_FROM` override was saved and the Experience service restarted; Bun environment precedence was checked locally against an isolated env-file fixture. A subsequent sign-in email arrived in the owned inbox with the new sender and canonical Experience address. Existing SMTP credentials and old sender registrations were preserved; no password or provider permission changed.
