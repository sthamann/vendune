//! Pure public-intake admission; extracted independently of the surrounding SQL and HTTP.
/// Public intake can only append to a private inbox in a live, cart-bound context.
pub fn app_submission_admissible(
    private_inbox: bool,
    live_scope: bool,
    current_cart: bool,
) -> bool {
    private_inbox && live_scope && current_cart
}
