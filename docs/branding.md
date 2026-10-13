# Sellama identity and compatibility

**Product:** Sellama. **Merchant workspace:** Sellama Studio.
**Operator console:** Sellama Platform.
**Canonical repository:** https://github.com/sthamann/sellama.
**Documentation:** https://sthamann.github.io/sellama/docs/.

The Sellama identity combines an outlined wordmark with a compact S exchange
symbol. Two interlocking ribbons express the interaction between buyer and
merchant; one mint terminal adds a restrained agent motif. The palette is
charcoal `#172120`, warm white `#F5F4EF` and mint `#82E4BC`. The S mark is used
for favicons and compact surfaces. UI and site favicons use identical copies checked by
`scripts/branding.py`; wordmarks have light and dark variants.
[Mark](brand/sellama-mark.svg), [wordmark](brand/sellama-logo.svg),
[dark wordmark](brand/sellama-logo-dark.svg). `shared/ui/Brand.tsx` owns the UI
identity and places the Studio label below the wordmark within the available
width. Tenant-owned company logos and merchant shop names are independent.

The [repository header](brand/sellama-readme.svg) uses the same vector identity
and the positioning “Commerce built around intelligence.” README product
images are unedited captures of the actual prototype.

## Package and deployment naming

The Rust crate and HTTP binary are `sellama`; Rust imports use `sellama::`.
The frontend package is `sellama-experience`. The application image uses `sellama`; fresh local database/search containers use
standard PostgreSQL and Qdrant images. The legacy `sellama-db` image is retained
for existing AGE/pgvector conversions. Fresh local installations use Compose project `sellama` and
container `sellama-postgres-1`. Start and worker commands, differential runners,
MCP examples, deployment files and CI use these names consistently.

Existing checkouts can stay in their original folder. `scripts/dev.sh` detects
an existing legacy Compose project and reuses its data volume. An explicit
`COMPOSE_PROJECT_NAME` takes precedence. Integration verification propagates its
selected container to every child suite, so both new and existing instances can
be checked. To stop an older installation use its actual Compose project name;
never delete its database volume to perform a rename.

## Deliberately stable contracts and historical records

- Existing `atelier` / `workshop` tenant IDs are data identities. User-created
  shop names, company brands, documents and orders are preserved.
- Browser `rac-*` session/cart/customer keys and internal `x-rac-*` principal
  headers retain their existing security behavior; renaming them is unnecessary
  and would invalidate sessions or integrations. Client principal headers remain
  untrusted and cannot grant access.
- Stored migration-ledger checksums remain unchanged. Six historical sources
  receive the explicit identity-only update requested for this rename. The
  migration runner accepts only the documented exact old/new SHA-256 pairs in
  `src/migrations/identity_checksums.rs`; an unreviewed byte change still fails.
  Additive migration `090-sellama-identity` updates the active trigger contracts
  and renames the diagnostic function while retaining its grants and behavior.
  No orders, customer records, IDs or audit history are rewritten.
- Existing Qdrant projections are preserved through additive collection aliases.
  Run the migration-only job with `QDRANT_NAMESPACE_MIGRATE_FROM` set to the
  deployment's actual previous namespace, alongside the existing `QDRANT_URL`
  and optional `QDRANT_API_KEY`. Leave it empty on fresh installs and serving
  replicas. The job validates the exact v2 collection names, model hash suffix,
  vector dimension and cosine geometry before changing any aliases. Existing
  canonical collections or conflicting aliases stop the job. It does not
  delete collections, change point IDs or spend credits on re-embedding.
  Repeating the job is idempotent; the regular deletion worker includes aliases
  so customer/merchant deletion still removes the appropriate tenant's points.
  The existing real PostgreSQL/Qdrant managed-search suite checks this migration
  through the compiled setup job and the normal search/deletion paths.
- The current WIT package is `sellama:commerce@1.0.0`. Existing immutable
  component packages can retain their approved source and digests: configure
  their actual previous namespace in `COMPONENT_LEGACY_NAMESPACES` during
  cutover. Only explicitly listed v1 namespaces are admitted. They reach the
  same bounded cart/product/app-record host through structurally checked WIT
  types; memory, tables, fuel, read-call quotas, money and output validation
  remain unchanged. Unknown namespaces/versions are rejected. No installed
  package is rewritten, resigned or granted additional permissions.
- Git history retains the original dated evidence. Current documentation uses
  the canonical product name and links. Regenerated media carries its actual
  new capture source, date and hashes; no old capture is presented as new.

`python3 scripts/branding.py` checks package/runtime paths, current public
identity, shared SVG assets, source ownership and the absence of stale platform
branding in the current frontend, website and README. It does not assert a
trademark clearance or production readiness.
