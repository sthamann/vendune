//! All configuration entry points require the publishing actor's native action rights; queued work rechecks them.
use super::*;
pub(crate) fn authorize_flow(h: &RequestContext, f: &flows::Flow) -> Result<()> {
    fn action(h: &RequestContext, name: &str) -> Result<()> {
        auth::permit(h, flow_actions::permission(name))?;
        if matches!(name, "ai_proposal" | "knowledge.extract") {
            auth::permit(h, "knowledge.read")?;
        }
        Ok(())
    }
    if let Some(p) = &f.pipeline {
        for node in &p.nodes {
            if let pipeline::Node::Action { action: name, .. } = node {
                action(h, name)?;
            }
        }
    } else {
        action(h, &f.action)?;
    }
    Ok(())
}

/// Native save and release validate final settings and installed app actions in their write transaction.
pub(crate) async fn validate_flow_config(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    h: &RequestContext,
    value: &Value,
) -> Result<()> {
    let f: flows::Flow = serde_json::from_value(value.clone()).map_err(|_| bad("Invalid flow"))?;
    f.validate()?;
    authorize_flow(h, &f)?;
    let settings = commerce::decode_config(
        sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1 FOR UPDATE")
            .bind(t)
            .fetch_one(&mut **tx)
            .await?,
    )?;
    commerce::validate_names(&value["name"], &settings, 100)?;
    super::flow_text::validate(&f, &settings)?;
    let mut steps = vec![];
    if f.action == "app_action" {
        steps.push(f.clone());
    }
    if let Some(p) = &f.pipeline {
        for node in &p.nodes {
            if let pipeline::Node::Action { action, config, .. } = node
                && (action == "app_action" || action == "action.mail.send")
            {
                let mut step = f.clone();
                step.action = "app_action".into();
                step.app_action = Some(flows::AppFlowAction {
                    app: config["app"].as_str().unwrap_or("email").into(),
                    action: config["action"].as_str().unwrap_or("send_order").into(),
                    arguments: if action == "action.mail.send" {
                        json!({"locale":&f.locale[..2],"dryRun":false})
                    } else {
                        config["arguments"].clone()
                    },
                });
                steps.push(step);
            }
        }
    }
    for step in steps {
        let target = step
            .app_action
            .as_ref()
            .ok_or(bad("Flow app action required"))?;
        sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,7))")
            .bind(format!("{t}:{}", target.app))
            .execute(&mut **tx)
            .await?;
        let row = sqlx::query("SELECT manifest,active FROM app_packages WHERE tenant=$1 AND id=$2")
            .bind(t)
            .bind(&target.app)
            .fetch_optional(&mut **tx)
            .await?
            .ok_or(bad("Flow app is not installed"))?;
        if !row.get::<bool, _>("active") {
            return Err(conflict("Flow app is inactive"));
        }
        let m: apps::Manifest = serde_json::from_value(row.get("manifest"))
            .map_err(|_| bad("Invalid installed manifest"))?;
        app_flows::validate_manifest_flow(h, &step, &m)?;
    }
    Ok(())
}
