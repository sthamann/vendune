//! Optional last-used payment preference is written after purchase commit, without holding cart/unit/product locks.
use super::*;
pub(crate) async fn remember_payment(a: &App, c: &StoredCart, method: &str) {
    let Some(customer) = &c.data.customer_id else {
        return;
    };
    // A convenience default is not part of the financial order. Concurrent preflight
    // readers hold customer SHARE while waiting for the unit: updating it inside
    // checkout created a customer/unit lock inversion. Never fail a committed
    // purchase because this non-financial preference could not be remembered.
    if sqlx::query("UPDATE customers SET last_payment_method_id=$1 WHERE tenant=$2 AND id=$3 AND active AND last_payment_method_id IS DISTINCT FROM $1")
        .bind(method).bind(&c.tenant).bind(customer).execute(&a.db).await.is_err() {
        eprintln!("Customer payment preference update failed after committed purchase");
    }
}
