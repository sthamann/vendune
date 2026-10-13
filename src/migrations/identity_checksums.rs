//! Explicit source-hash pairs for the reviewed identity-only migration source update.
use crate::hash;
// Stored ledger bytes remain unchanged. Only these exact pre-rename hashes qualify.
const APPROVED: &[(&str, &str, &str)] = &[
    (
        "034-entity-history",
        "8cf1682e7aab1772c40c00cdb07333b74ae01075d596d2bd45133b98dc396fd3",
        "04510e911fc5693c4d4f41772b099122f6928678318c6c65c15a55b9d96c567e",
    ),
    (
        "035-history-finalization",
        "5927dfde5938dad74cfcb4dee947b1864d82375fbc97c8e2db331c28eb1f031d",
        "570844745676f6c08e66dc980123c742546c2b75779438efc17a59a6932a49c2",
    ),
    (
        "046-cache-invalidation",
        "5b7a9dbb315c5169f41de96af7057dfd28550fea81f9f1157b4f50bb7cb03238",
        "7ce152c278cc59d596454f7c3b41d18290305ee28c926400792be74e1e08679f",
    ),
    (
        "056-http-response-diagnostics",
        "8a73e789addfe7328d5fe09a4fbe02044e21c18282ba14de7e290d8ff1c7556d",
        "7e3bf0048bc33ba0092e5dfc4f2decc0316bfd4a99c197f32ea2a627b6bf141f",
    ),
    (
        "057-core-hardening",
        "558d728f668e9438d70826484eb45fdebfaf243a19868d1afc161ca33be49ec2",
        "3832cddadcb7a940f1a096af0315e5e4efeba299c3cc60b4813005e8e55518c9",
    ),
];
pub(super) fn matches(version: &str, source: &str, applied: &str) -> bool {
    let current = hash(source);
    applied == current
        || APPROVED
            .iter()
            .any(|(v, new, old)| *v == version && *new == current && *old == applied)
}
#[cfg(test)]
mod tests {

    use super::*;
    #[test]
    fn only_exact_reviewed_source_and_ledger_pairs_are_accepted() {
        for (version, new, old) in APPROVED {
            let source = super::super::sources().iter().find(|(v, _)| v == version).unwrap().1;
            assert_eq!(hash(source), *new);
            assert!(matches(version, source, old));
            assert!(matches(version, source, new));
            assert!(!matches("unknown", source, old));
            assert!(!matches(version, &format!("{source}\n-- unreviewed"), old));
            assert!(!matches(version, source, "invalid"));
        }
    }
}
