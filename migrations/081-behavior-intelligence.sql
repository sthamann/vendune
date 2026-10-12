-- Extend the existing consent-bound event ledger; no second analytics truth store.
SET search_path=public;
ALTER TABLE session_signal_events
 ADD COLUMN purpose text NOT NULL DEFAULT 'personalization' CHECK(purpose IN ('personalization','analytics')),
 ADD COLUMN kind text NOT NULL DEFAULT 'signal',
 ADD COLUMN cart_id text,
 ADD COLUMN channel_id text,
 ADD COLUMN product_id text,
 ADD COLUMN customer_id text,
 ADD COLUMN dimensions jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 ADD CONSTRAINT behavior_cart_fk FOREIGN KEY(tenant,cart_id) REFERENCES carts(tenant,id) ON DELETE CASCADE,
 ADD CONSTRAINT behavior_channel_fk FOREIGN KEY(tenant,channel_id) REFERENCES sales_channels(tenant,id) ON DELETE CASCADE,
 ADD CONSTRAINT behavior_product_fk FOREIGN KEY(tenant,product_id) REFERENCES products(tenant,id) ON DELETE SET NULL(product_id),
 ADD CONSTRAINT behavior_customer_fk FOREIGN KEY(tenant,customer_id) REFERENCES customers(tenant,id) ON DELETE SET NULL(customer_id),
 ADD CONSTRAINT behavior_dimensions_bound CHECK(octet_length(dimensions::text)<=2048);
UPDATE session_signal_events SET expires_at=created_at+interval '30 days';
CREATE INDEX behavior_window ON session_signal_events(tenant,purpose,created_at DESC) WHERE purpose='analytics';
CREATE INDEX behavior_journey ON session_signal_events(tenant,session,created_at DESC) WHERE purpose='analytics';
CREATE INDEX behavior_expiry ON session_signal_events(expires_at) WHERE purpose='analytics';
