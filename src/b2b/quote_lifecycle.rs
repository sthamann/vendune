//! App-owned RFQ preparation states reuse native quote CAS, ownership, history and outbox; only native offer/accept moves money.
use super::*;
pub(super) fn transition(
    h: &RequestContext,
    data: &Value,
    current: &str,
    action: &str,
) -> Result<(String, Value)> {
    let snapshot = apps::native_lifecycle::snapshot(data, "quote")?
        .ok_or(conflict("Quote has no accepted app lifecycle"))?;
    let edge = snapshot
        .machine
        .transitions
        .iter()
        .find(|e| e.from == current && e.id == action)
        .ok_or(conflict(
            "Quote transition is not declared for its accepted version",
        ))?;
    let reason = apps::native_lifecycle::reason(h, edge, data);
    let native = current == "requested"
        || snapshot.machine.states.iter().any(|s| {
            s.id == current && !["offered", "accepted", "ordered", "rejected"].contains(&current)
        });
    if !apps::native_lifecycle::allowed(
        native,
        reason != Some("lifecyclePermission"),
        reason != Some("lifecycleGuard"),
    ) {
        return Err(Error(
            if reason == Some("lifecyclePermission") {
                StatusCode::FORBIDDEN
            } else {
                StatusCode::CONFLICT
            },
            reason.unwrap_or("Quote is closed").into(),
        ));
    }
    Ok((edge.to.clone(), json!(edge.policy)))
}
pub(super) fn preparation(data: &Value, state: &str) -> bool {
    state == "requested"
        || apps::native_lifecycle::snapshot(data, "quote")
            .ok()
            .flatten()
            .is_some_and(|s| {
                s.machine.states.iter().any(|s| s.id == state)
                    && !["offered", "accepted", "ordered", "rejected"].contains(&state)
            })
}
pub(super) fn projection(data: &Value, state: &str, h: &RequestContext, admin: bool) -> Value {
    let Some(snapshot) = apps::native_lifecycle::snapshot(data, "quote")
        .ok()
        .flatten()
    else {
        return Value::Null;
    };
    let label = snapshot
        .machine
        .states
        .iter()
        .find(|s| s.id == state)
        .map(|s| &s.label);
    let actions = if admin {
        snapshot.machine.transitions.iter().filter(|e| e.from == state).map(|e| {
        let reason = apps::native_lifecycle::reason(h, e, data);
        json!({"id":e.id,"state":e.to,"label":e.label,"enabled":reason.is_none(),"reason":reason,"source":e.policy})
    }).collect::<Vec<_>>()
    } else {
        vec![]
    };
    json!({"label":label,"actions":actions,"mainLocale":snapshot.main_locale,"preparation":preparation(data,state)})
}
