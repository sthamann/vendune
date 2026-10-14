//! Admin CRM creation uses native contacts/address storage, history and outbox; it never issues customer credentials.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    email: String,
    profile: accounts::Contact,
    customer_group: String,
    billing_address: commerce::Address,
    shipping_address: Option<commerce::Address>,
    request_key: String,
}
pub(super) async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "customers.write")?;
    auth::permit(&h, "customers.pii")?;
    if v["profile"].to_string().len() > 4000 {
        return Err(bad("Invalid customer profile"));
    }
    let mut input: Input = serde_json::from_value(v.clone())
        .map_err(|_| bad("Complete customer profile and billing address required"))?;
    let email = auth::email(&json!({"email":input.email}))?;
    input.profile.validate()?;
    if !(8..=128).contains(&input.request_key.len()) {
        return Err(bad("Customer request key required"));
    }
    let id = hash(&format!(
        "{t}:{}:{}",
        header(&h, "x-rac-user").unwrap_or(""),
        input.request_key
    ));
    let fingerprint = hash(&v.to_string());
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    let (settings, _) = commerce::scoped_locked(&mut tx, &t, "default").await?;
    if !settings
        .customer_groups
        .iter()
        .any(|g| g.id == input.customer_group)
    {
        return Err(bad("Unknown customer group"));
    }
    for address in
        std::iter::once(&mut input.billing_address).chain(input.shipping_address.iter_mut())
    {
        address.validate()?;
        commerce::validate_address_geography(address, &settings)?;
        if !settings.countries.contains(&address.country) {
            return Err(bad("Address country unavailable"));
        }
    }
    if let Some(row) =
        sqlx::query("SELECT email,automation FROM customers WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(&id)
            .fetch_optional(&mut *tx)
            .await?
    {
        if row.get::<Value, _>("automation")["adminCreationFingerprint"] != fingerprint {
            return Err(conflict(
                "Customer request key already used for different input",
            ));
        }
        return Ok(Json(
            json!({"id":id,"email":row.get::<String,_>("email"),"created":true}),
        ));
    }
    // An invalid credential hash cannot be used to sign in. Storefront access is not granted by a CRM creation.
    let n = sqlx::query("INSERT INTO customers(tenant,id,email,password_hash,profile,company,group_name,automation) VALUES($1,$2,$3,'!',$4,NULLIF($5,''),$6,$7) ON CONFLICT DO NOTHING")
        .bind(&t).bind(&id).bind(&email).bind(json!(input.profile)).bind(&input.profile.company).bind(&input.customer_group).bind(json!({"adminCreationFingerprint":fingerprint})).execute(&mut *tx).await?.rows_affected();
    if n != 1 {
        return Err(conflict(
            "Customer already exists; select the existing customer",
        ));
    }
    accounts::address_save_conn(
        &mut tx,
        &t,
        &email,
        None,
        &json!({"defaultBilling":true,"defaultShipping":input.shipping_address.is_none()}),
        &input.billing_address,
    )
    .await?;
    if let Some(address) = input.shipping_address {
        accounts::address_save_conn(
            &mut tx,
            &t,
            &email,
            None,
            &json!({"defaultShipping":true}),
            &address,
        )
        .await?;
    }
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'customer.created',$2)")
        .bind(&t)
        .bind(json!({"customerId":id,"actor":header(&h,"x-rac-user"),"source":"merchant"}))
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(Json(json!({"id":id,"email":email,"created":true})))
}

/// Safe creation choices are available to CRM writers without granting settings access.
pub(super) async fn context(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "customers.write")?;
    auth::permit(&h, "customers.pii")?;
    let (s, _) = commerce::config(&a, &t).await?;
    Ok(Json(
        json!({"elements":s.customer_groups,"countries":s.countries,"mainLocale":s.main_locale}),
    ))
}
