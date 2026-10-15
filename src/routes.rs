//! HTTP transport registry; domain behavior lives in dedicated modules.
use crate::*;
pub(crate) fn router(a: App) -> Router {
    Router::new()
        .merge(auth::entry_router())
        .route("/products/{id}", get(storefront_pages::product_page))
        .route(
            "/products/{id}/{slug}",
            get(storefront_pages::product_page_slug),
        )
        .merge(platform::router())
        .merge(shop_domains::frontends::router())
        .merge(currencies::router())
        .merge(translations::router())
        .merge(apps::app_router())
        .merge(apps::site_builder::router())
        .merge(checkout_handoff::router())
        .merge(documents::router())
        .merge(staging::router())
        .merge(studio::personal::router())
        .merge(developer::router())
        .merge(accounts::router())
        .merge(legal::router())
        .merge(operations::router())
        .merge(history::router())
        .merge(assets::router())
        .merge(categories::router())
        .merge(commerce::product_admin_router())
        .merge(marketing::router())
        .merge(pos::router())
        .merge(b2b::router())
        .merge(payments::payment_router())
        .merge(cognition::cognition_router())
        .secure_route(
            "/api/merchant/commerce/channels/{channel}",
            &[("GET", "settings.read"), ("PUT", "settings.write")],
            get(commerce::get_scope).put(commerce::save_scope),
        )
        .secure_route(
            "/api/merchant/commerce/methods/{area}/{id}/dependencies",
            &[("GET", "settings.read")],
            get(commerce::method_dependencies),
        )
        .secure_route(
            "/api/runtime/outbox/{id}/retry",
            &[("POST", "settings.write")],
            post(retry_outbox),
        )
        .route("/health", get(health))
        .secure_route(
            "/api/auth/register",
            &[("POST", "public")],
            post(auth::register_user),
        )
        .secure_route(
            "/api/auth/login",
            &[("POST", "public")],
            post(auth::user_login),
        )
        .secure_route(
            "/api/auth/session",
            &[("GET", "read")],
            get(auth::user_session),
        )
        .secure_route(
            "/api/auth/logout",
            &[("POST", "read")],
            post(auth::user_logout),
        )
        .secure_route("/api/auth/access", &[("GET", "read")], get(auth::access))
        .secure_route(
            "/api/auth/sessions",
            &[("GET", "read")],
            get(auth::sessions),
        )
        .secure_route(
            "/api/auth/sessions/{id}",
            &[("DELETE", "read")],
            axum::routing::delete(auth::revoke_session),
        )
        .secure_route(
            "/api/workspace/invitations/{id}",
            &[("DELETE", "team.manage")],
            axum::routing::delete(auth::revoke_invite),
        )
        .secure_route(
            "/api/auth/accept",
            &[("POST", "public")],
            post(auth::accept_invite),
        )
        .secure_route(
            "/api/workspaces",
            &[("POST", "read")],
            post(auth::create_workspace),
        )
        .secure_route(
            "/api/workspace/members",
            &[("GET", "team.manage")],
            get(auth::members),
        )
        .secure_route(
            "/api/workspace/integrations",
            &[("GET", "team.manage"), ("POST", "team.manage")],
            get(auth::integration_list).post(auth::integration_create),
        )
        .secure_route(
            "/api/workspace/integrations/{id}",
            &[("DELETE", "team.manage")],
            axum::routing::delete(auth::integration_revoke),
        )
        .secure_route(
            "/api/workspace/members/{id}",
            &[("PUT", "team.manage")],
            axum::routing::put(auth::update_member),
        )
        .secure_route(
            "/api/workspace/invitations",
            &[("POST", "team.manage")],
            post(auth::invite_user),
        )
        .route("/store-api/context", get(context_info))
        .route("/store-api/countries", get(commerce::country_catalogue))
        .secure_route(
            "/api/merchant/overview",
            &[("GET", "read")],
            get(merchant_overview),
        )
        .secure_route(
            "/api/merchant/quote",
            &[("POST", "catalog.read")],
            post(preview_quote),
        )
        .secure_route("/api/capabilities", &[("GET", "public")], get(capabilities))
        .route("/store-api/product", post(catalog_request))
        .route(
            "/store-api/product/{id}",
            get(commerce::product_detail).post(commerce::product_detail),
        )
        .route(
            "/store-api/product/{id}/reviews",
            post(commerce::submit_review),
        )
        .route("/store-api/checkout/options", get(commerce::options))
        .route(
            "/store-api/checkout/context",
            axum::routing::put(commerce::select_checkout),
        )
        .secure_route(
            "/api/merchant/commerce",
            &[("GET", "settings.read"), ("PUT", "settings.write")],
            get(commerce::merchant_config).put(commerce::save_config),
        )
        .secure_route(
            "/api/merchant/reviews/{id}",
            &[("PUT", "catalog.write")],
            axum::routing::put(commerce::moderate),
        )
        .secure_route(
            "/api/merchant/orders/{id}/transition",
            &[("POST", "orders.write")],
            post(commerce::transition_order),
        )
        .route(
            "/store-api/checkout/cart",
            get(get_cart).post(create_cart).put(edit_cart),
        )
        .route("/store-api/checkout/cart/line-item", post(add_items))
        .route("/store-api/checkout/order", post(place_order))
        .route("/store-api/account/login", post(login))
        .secure_route(
            "/api/merchant/products/{id}",
            &[("GET", "catalog.read"), ("PUT", "catalog.write")],
            get(commerce::product_editor).put(commerce::edit_product),
        )
        .secure_route(
            "/api/search/product",
            &[("POST", "catalog.read")],
            post(admin_catalog),
        )
        .secure_route(
            "/api/search/order",
            &[("POST", "orders.read")],
            post(orders),
        )
        .secure_route(
            "/api/agent/plan",
            &[("POST", "assistant.use")],
            post(agent_plan),
        )
        .secure_route(
            "/api/agent/providers",
            &[("GET", "read")],
            get(model_providers),
        )
        .secure_route(
            "/api/agent/chat",
            &[("POST", "assistant.use")],
            post(merchant_chat),
        )
        .secure_route(
            "/api/agent/conversations",
            &[("GET", "assistant.use")],
            get(conversations),
        )
        .secure_route(
            "/api/agent/conversations/{id}",
            &[("GET", "assistant.use")],
            get(conversation),
        )
        .secure_route(
            "/api/knowledge",
            &[("GET", "knowledge.read")],
            get(knowledge_graph),
        )
        .secure_route(
            "/api/knowledge/status",
            &[("GET", "knowledge.read")],
            get(knowledge_status),
        )
        .secure_route(
            "/api/knowledge/search",
            &[("POST", "knowledge.read")],
            post(semantic_search),
        )
        .secure_route(
            "/api/knowledge/reindex",
            &[("POST", "knowledge.write")],
            post(reindex),
        )
        .secure_route("/api/agent/tasks", &[("GET", "assistant.use")], get(tasks))
        .secure_route(
            "/api/agent/tasks/{id}/apply",
            &[("POST", "catalog.write")],
            post(agent_apply),
        )
        .secure_route(
            "/api/policy",
            &[("GET", "knowledge.read")],
            get(policy_stats),
        )
        .secure_route("/api/experience", &[("POST", "public")], post(experience))
        .route("/store-api/personalization/events", post(personalization))
        .route(
            "/store-api/personalization",
            axum::routing::delete(forget_personalization),
        )
        .secure_route("/api/concierge", &[("POST", "public")], post(concierge))
        .secure_route("/api/runtime", &[("GET", "settings.read")], get(runtime))
        .secure_route(
            "/api/extensions/activate",
            &[("POST", "apps.manage")],
            post(activate_extension),
        )
        .secure_route(
            "/api/extensions",
            &[("GET", "apps.manage")],
            get(extension_state),
        )
        .route(
            "/mcp",
            post(mcp).get(|| async { StatusCode::METHOD_NOT_ALLOWED }),
        )
        .merge(ucp::ucp_router())
        .fallback_service(performance::delivery::assets())
        .layer(axum::extract::DefaultBodyLimit::max(64 * 1024))
        .layer(axum::middleware::from_fn(performance::memoize))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            shop_domains::frontends::serve,
        ))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            track_channels,
        ))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            auth::authenticate,
        ))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            auth::browser::apply,
        ))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            accounts::browser::apply,
        ))
        .layer(axum::middleware::from_fn(performance::delivery::classify))
        .layer(axum::middleware::from_fn_with_state(
            a.clone(),
            shop_domains::resolve,
        ))
        .layer(performance::delivery::compression())
        .layer(axum::middleware::from_fn(security_headers::apply))
        .layer(axum::middleware::from_fn(brand_redirect::apply))
        .with_state(a)
}
