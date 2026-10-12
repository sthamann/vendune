//! Generated input/output driver; production policies are dispatched by the generated module.
#[path = "verified_kernel/dispatch.rs"]
mod dispatch;
use serde_json::Value;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    use std::io::{self, BufRead};
    for line in io::stdin().lock().lines() {
        let input: Value = serde_json::from_str(&line?)?;
        println!("{}", dispatch::eval(&input).map_err(io::Error::other)?);
    }
    Ok(())
}
