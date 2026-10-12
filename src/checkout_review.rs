//! Bind the reviewed revision and exact total for every checkout transport.
use crate::*;
pub(crate) fn validate(h: &RequestContext, c: &StoredCart, q: &Value, minor: i64) -> Result<()> {
    // Legacy API clients may omit the pair. Browser checkout always binds its reviewed quote.
    match (
        header(h, "x-commerce-cart-revision"),
        header(h, "x-commerce-total-minor"),
    ) {
        (None, None) => {}
        (Some(revision), Some(total)) => {
            let revision = revision
                .parse::<u64>()
                .map_err(|_| bad("Invalid reviewed cart revision"))?;
            let total = total
                .parse::<i64>()
                .map_err(|_| bad("Invalid reviewed total"))?;
            if !u64::try_from(total)
                .ok()
                .zip(u64::try_from(minor).ok())
                .is_some_and(|(expected, actual)| {
                    verified_kernel::checkout_review_admissible(
                        verified_kernel::revision_admissible(c.revision as u64, revision),
                        expected,
                        actual,
                        q["selectionNeedsConfirmation"] != true,
                    )
                })
            {
                return Err(conflict("Checkout changed; review your order again"));
            }
        }
        _ => {
            return Err(bad(
                "Reviewed cart revision and total must be supplied together",
            ));
        }
    }
    Ok(())
}
