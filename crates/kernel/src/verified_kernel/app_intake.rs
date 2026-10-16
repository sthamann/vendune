//! Pure public-intake admission; extracted independently of the surrounding SQL and HTTP.
/// Public intake can only append to a private inbox in a live, cart-bound context.
pub fn app_submission_admissible(
    private_inbox: bool,
    live_scope: bool,
    current_cart: bool,
) -> bool {
    private_inbox && live_scope && current_cart
}

/// Permanent credentials and credential settings require a current personal administrator.
pub fn persistent_key_admissible(personal: bool, administrator: bool) -> bool {
    personal && administrator
}

/// Operational customer/order extensions cannot become configuration release units.
pub fn app_configuration_release_admissible(extension: bool, product: bool, company: bool) -> bool {
    !extension || product || company
}
