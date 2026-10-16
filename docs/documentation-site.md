# The connected Veyndo handbook

The [public handbook](https://veyndo.ai/docs/) follows a deliberate reading path:
understand and try the product → connect intelligence → shape experiences → build
apps and automation → operate commerce → control changes → inspect the foundation.
It opens on the Veyndo website and uses the repository's Markdown as its source.

## Find the right starting point

| Your goal | Start here |
| --- | --- |
| Understand what Veyndo does | [Feature guide](features.md) and [connected cognition](cognitive-commerce.md) |
| Try a complete working round | [First tour](first-tour.md) |
| Give an agent a bounded job | [Agent workshop](agent-workshop.md) |
| Create an extension | [Visual App Studio](app-studio.md) and [five illustrated workshops](app-tutorials/README.md) |
| Design a connected shop | [Experience integration](experience-integration.md), [Storyfront](storyfront.md) and [checkout](checkout.md) |
| Deploy or assess the boundaries | [Architecture](production-architecture.md), [hosting](managed-hosting.md) and [security](security.md) |

Every rendered article provides its original source, chapter navigation and an
article outline. Previous/next links follow the chapter sequence. Wide tables and
code scroll within the article; the chapter menu collapses on small screens.

Search covers the **complete** Markdown inventory, including module READMEs and
historical evidence. The curated chapters lead with current guides; the complete
reference retains other sources and their original dates and scope.

## One publication, two public surfaces

The existing Pages workflow builds the complete source inventory, search index,
navigation, assets and canonical metadata. `scripts/check_site.py` checks every
local link, anchor, article, search record and sitemap entry before publication.
`site/docs-navigation.json` owns the curated chapter order;
`site/docs-copy.json` owns the interface text.

The private website runtime serves `/docs/` on the apex from the fixed public
GitHub Pages publication. It does not copy articles into another knowledge store
or use merchant sessions. Cookies, authorization and tenant headers are never
forwarded upstream. Only public documentation paths and GET/HEAD are accepted;
recordings use streaming and bounded ranges. API, shop and Experience hosts keep
their own existing routes. GitHub Pages remains an independently readable mirror.

## Language and evidence

Handbook navigation, search messages and chapter descriptions ship in English,
German, French and Spanish. Technical articles currently retain their original
English content and are labeled accordingly. A localized interface is not a claim
that all historical technical prose has been translated.

Current README screenshots are genuine browser captures with the blue Veyndo
identity. [Capture notes](assets/launch-20261014/README.md) distinguish synthetic
commerce and local model fixtures from real provider transactions. Historical
recordings remain dated evidence and are not presented as current-interface stills.


## Build and validate

From the repository root, use a virtual environment if your Python installation
requires one, then run:

```sh
python3 -m pip install -r site/requirements.txt
python3 scripts/build_site.py
python3 scripts/check_site.py
python3 scripts/testing/source_inventory.py
python3 scripts/api_catalogue.py --check
python3 scripts/structure.py
```

The structure check also needs `npm ci` in `frontend/`. The site renderer uses
the pinned Python-Markdown dependency; ordinary commerce does not need it.
Output is ignored `.site/`. Preview it with a local static web server.

The site check covers every source document, rendered page, local link, image,
heading target, unique title, discovery metadata, search inventory and sitemap.
Missing repository targets stop the build; missing rendered anchors fail the
check. Untracked, non-ignored Markdown is included for local previews before its
first commit; only committed files reach CI. Do not put private notes in the
public repository.

## Publication and current facts

The 16 October app review reconciles shared storage, saved agent work and enforced
database/browser authority across README, app guides, architecture notes and the
release tracker. [App-system status](app-system-status.md) is the reader's entry
to delivered/partial/open behavior. The app chapter now links that map, the
business-capability direction and the exact storage guide before deeper tutorials.
Dated receipts remain unchanged; later results explicitly supersede earlier
observations only for the later source tree.


The 12 October update adds [five illustrated App Studio workshops](app-tutorials/README.md)
and twelve fresh English browser captures. It reconciles the README/app references
with package ownership, native controls, the 280-route catalogue and 424 Rust
modules. Historical captures, measurements and public rollout observations retain
their dates; the tutorials distinguish sample design, private preview, staging
installation and actual clock/provider delivery.

The existing GitHub Pages workflow builds on every pull request and `main` push,
and publishes only `main` or an explicit manual run. There is no path filter:
new Markdown and code-derived module notes cannot silently miss a publication.
GitHub's required `verify` check still protects merges. No authentication or
production commerce setting changes are needed for documentation publication.

The October 6, 2026 review checked the repository's Markdown inventory, current
module ownership, source links and rendered anchors. It corrected PostgreSQL/Qdrant
versus legacy AGE/pgvector descriptions, enabled content languages, channel
settings/lifecycle, worker roles, personal credentials, payment scope, source
inventories and verification counts. Dated benchmarks, captures and test results
retain their original measurement scope; a documentation review does not rerun
every historical experiment or verify live provider accounts.

The 8 October review reconciled README, the full feature tour, app/Experience/channel
guides, the homepage and `llms.txt` with `706102f`. It corrected obsolete main-channel
pause restrictions, EUR-only wording, the API/formal inventories and manually installed
Storyfront claims. Three unretouched public demo captures complement the retained
6 October recordings. [Current release](current-release.md) and
[capture provenance](assets/showcase/README.md) distinguish deployed behavior,
isolated tests and remaining native/provider activation work.

For future changes, read the actual owning code/configuration and update its guide
in the same change. Regenerate `module-inventory.md` with
`python3 scripts/testing/source_inventory.py --write` when source modules change.
Review local module README lists too. Passing link/build checks does not prove
every prose claim; observed behavior, implementation scope and proposed work
must stay distinct. Use [the testing guide](testing.md) and
[formal scope](formal-verification.md) for exact evidence boundaries.

The subsequent 8 October core review is documented in [core hardening](core-hardening.md),
with a rendered request/event diagram, all eighteen findings, deployment settings,
regressions and remaining proof/operational boundaries. Older latency and screenshot
measurements retain their original scope; they are not relabelled as hardening results.
