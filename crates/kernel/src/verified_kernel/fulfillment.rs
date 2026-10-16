//! Pure package allocation and carrier-intent admission; external facts and effects remain unproved.
/// Package splitting moves a strict positive subset of an open, nonterminal allocation.
pub fn delivery_split_admissible(
    is_open: bool,
    terminal: bool,
    available: u64,
    moving: u64,
) -> bool {
    is_open && !terminal && moving > 0 && moving < available
}

/// An open eligible parcel admits an empty or identical carrier intent, never another occupied booking.
pub fn carrier_booking_admissible(
    is_open: bool,
    closed: bool,
    labelled: bool,
    occupied: bool,
    same: bool,
) -> bool {
    is_open && !closed && !labelled && (!occupied || same)
}
