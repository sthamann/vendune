# seLLM identity and compatibility

**Product:** seLLM. **Merchant workspace:** seLLM Studio.
**Operator console:** seLLM Platform.
**Canonical repository:** https://github.com/sthamann/sellm.
**Documentation:** https://sthamann.github.io/sellm/docs/.

The seLLM identity uses an outlined geometric wordmark with a mint terminal
cursor. The restrained palette is charcoal `#17212b`, off-white `#f3f7fb` and
mint `#2be3b7`. The compact double-L mark is reserved for favicons and compact
surfaces. UI and site favicons use identical copies checked by
`scripts/branding.py`; wordmarks have light and dark variants.
[Mark](brand/sellm-mark.svg), [wordmark](brand/sellm-logo.svg),
[dark wordmark](brand/sellm-logo-dark.svg). `shared/ui/Brand.tsx` owns the UI
identity and places the Studio label below the wordmark within the available
width. Tenant-owned company logos and merchant shop names are independent.

The [repository header](brand/sellm-readme.svg) uses the same identity. Its
connected intelligence diagram is authored brand artwork, not a browser
screenshot or a performance claim. README product images remain unedited
captures of the actual English prototype.

## Package and deployment naming

The Rust crate and HTTP binary are `sellm`; Rust imports use `sellm::`.
The frontend package is `sellm-experience`. The application image uses `sellm`; fresh local database/search containers use
standard PostgreSQL and Qdrant images. The legacy `sellm-db` image is retained
for existing AGE/pgvector conversions. Fresh local installations use Compose project `sellm` and
container `sellm-postgres-1`. Start and worker commands, differential runners,
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
  Additive migration `090-sellm-identity` updates the active trigger contracts
  and renames the diagnostic function while retaining its grants and behavior.
  No orders, customer records, IDs or audit history are rewritten.
- Git history retains the original dated evidence. Current documentation uses
  the canonical product name and links. Regenerated media carries its actual
  new capture source, date and hashes; no old capture is presented as new.

`python3 scripts/branding.py` checks package/runtime paths, current public
identity, shared SVG assets, source ownership and the absence of stale platform
branding in the current frontend, website and README. It does not assert a
trademark clearance or production readiness.
