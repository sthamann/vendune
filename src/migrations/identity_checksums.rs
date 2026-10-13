//! Explicit source-hash pairs for the reviewed identity-only migration source update.
use crate::hash;
// Stored ledger bytes remain unchanged. Only these exact pre-rename hashes qualify.
const APPROVED: &[(&str, &str, &str)] = &[
    (
        "034-entity-history",
        "64216b1b49cd5078a57a03a5a82de6ef68a5c3563f3b5e91fcf56eef05d47820",
        "04510e911fc5693c4d4f41772b099122f6928678318c6c65c15a55b9d96c567e",
    ),
    (
        "035-history-finalization",
        "a98327e1a4d5a89266d559a93e2e92f90ba18188196f89407ababd47fcb0dbb5",
        "570844745676f6c08e66dc980123c742546c2b75779438efc17a59a6932a49c2",
    ),
    (
        "046-cache-invalidation",
        "be29ec68e295aa33ee9f5c16b41037dc2d7750654c7a1a10f84f2ad0efaab81a",
        "7ce152c278cc59d596454f7c3b41d18290305ee28c926400792be74e1e08679f",
    ),
    (
        "056-http-response-diagnostics",
        "e66f965dd57e49371c26da394681f39d6ae8b3ab54e809ae286616f0513065ec",
        "7e3bf0048bc33ba0092e5dfc4f2decc0316bfd4a99c197f32ea2a627b6bf141f",
    ),
    (
        "057-core-hardening",
        "4aae1b2844ecc237ae01beffaa0cd13afa62252c48f29940094d6ca6ca3357e1",
        "3832cddadcb7a940f1a096af0315e5e4efeba299c3cc60b4813005e8e55518c9",
    ),
    (
        "082-workspace-roles",
        "c93a4200e102439707e4150ac5449196c7ec669ff8feaeff2f420bf94e04e98e",
        "2e425ca0b2e553243d8a6537eb2e8057c467717b9b20846d6a8cfb88464d5f44",
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
            let source = super::super::sources()
                .find(|(v, _)| v == version)
                .unwrap()
                .1;
            assert_eq!(hash(source), *new);
            assert!(matches(version, source, old));
            assert!(matches(version, source, new));
            assert!(!matches("unknown", source, old));
            assert!(!matches(version, &format!("{source}\n-- unreviewed"), old));
            assert!(!matches(version, source, "invalid"));
        }
    }
}
