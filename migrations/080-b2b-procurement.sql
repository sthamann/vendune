-- Native procurement identities and decisions; EDI protocol code remains app-owned.
CREATE TABLE b2b_companies (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL, data jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,id)
);
CREATE TABLE b2b_units (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL, company_id text NOT NULL,
 parent_id text, data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(tenant,id), UNIQUE(tenant,company_id,id),
 FOREIGN KEY(tenant,company_id) REFERENCES b2b_companies(tenant,id),
 FOREIGN KEY(tenant,company_id,parent_id) REFERENCES b2b_units(tenant,company_id,id),
 CHECK(parent_id IS DISTINCT FROM id)
);
CREATE TABLE b2b_members (
 tenant text NOT NULL REFERENCES tenants(id), unit_id text NOT NULL, customer_id text NOT NULL,
 data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(tenant,unit_id,customer_id),
 FOREIGN KEY(tenant,unit_id) REFERENCES b2b_units(tenant,id),
 FOREIGN KEY(tenant,customer_id) REFERENCES customers(tenant,id)
);
CREATE TABLE b2b_catalog (
 tenant text NOT NULL REFERENCES tenants(id), unit_id text NOT NULL, product_id text NOT NULL,
 PRIMARY KEY(tenant,unit_id,product_id),
 FOREIGN KEY(tenant,unit_id) REFERENCES b2b_units(tenant,id),
 FOREIGN KEY(tenant,product_id) REFERENCES products(tenant,id)
);
CREATE TABLE b2b_approvals (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL, unit_id text NOT NULL,
 buyer_id text NOT NULL, cart_id text NOT NULL, fingerprint text NOT NULL, data jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','consumed')),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,id), UNIQUE(tenant,cart_id,fingerprint),
 FOREIGN KEY(tenant,unit_id,buyer_id) REFERENCES b2b_members(tenant,unit_id,customer_id),
 FOREIGN KEY(tenant,cart_id) REFERENCES carts(tenant,id)
);
CREATE TABLE b2b_budget_allocations (
 tenant text NOT NULL REFERENCES tenants(id), order_id text NOT NULL, unit_id text NOT NULL,
 period_start date NOT NULL, currency text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 released boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant,order_id),
 FOREIGN KEY(tenant,order_id) REFERENCES orders(tenant,id),
 FOREIGN KEY(tenant,unit_id) REFERENCES b2b_units(tenant,id)
);
CREATE INDEX b2b_budget_usage ON b2b_budget_allocations(tenant,unit_id,period_start,currency) WHERE NOT released;
CREATE INDEX b2b_approval_inbox ON b2b_approvals(tenant,unit_id,state,created_at DESC);
CREATE INDEX b2b_customer_membership ON b2b_members(tenant,customer_id,unit_id);
CREATE TABLE b2b_lists (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL, unit_id text NOT NULL, owner_id text NOT NULL,
 data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(tenant,id), FOREIGN KEY(tenant,unit_id,owner_id) REFERENCES b2b_members(tenant,unit_id,customer_id)
);
CREATE INDEX b2b_lists_unit ON b2b_lists(tenant,unit_id,id);
CREATE TABLE b2b_quotes (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL, unit_id text NOT NULL, buyer_id text NOT NULL,
 cart_id text NOT NULL, state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','offered','accepted','ordered','rejected')),
 data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,id), FOREIGN KEY(tenant,unit_id,buyer_id) REFERENCES b2b_members(tenant,unit_id,customer_id),
 FOREIGN KEY(tenant,cart_id) REFERENCES carts(tenant,id)
);
CREATE INDEX b2b_quotes_buyer ON b2b_quotes(tenant,unit_id,buyer_id,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['b2b_companies','b2b_units','b2b_members','b2b_catalog','b2b_approvals','b2b_budget_allocations','b2b_lists','b2b_quotes'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY core_tenant_scope ON %I USING(current_setting(''rac.system'',true)=''on'' OR tenant=nullif(current_setting(''rac.tenant'',true),'''')) WITH CHECK(current_setting(''rac.system'',true)=''on'' OR tenant=nullif(current_setting(''rac.tenant'',true),''''))',t);
 END LOOP;
END $$;

-- Extend the existing audit owner rather than introducing a separate B2B history ledger.
ALTER FUNCTION entity_history_snapshot(text,text,text) RENAME TO entity_history_snapshot_before_b2b;
CREATE FUNCTION entity_history_snapshot(kind text,t text,k text) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE s jsonb;
BEGIN
 IF kind='b2bCompany' THEN
  SELECT to_jsonb(r)-'tenant' INTO s FROM b2b_companies r WHERE tenant=t AND id=k;
 ELSIF kind='b2bUnit' THEN
  SELECT (to_jsonb(r)-'tenant')||jsonb_build_object(
   'members',coalesce((SELECT jsonb_agg(to_jsonb(m)-'tenant' ORDER BY customer_id) FROM b2b_members m WHERE m.tenant=t AND m.unit_id=k),'[]'),
   'catalog',coalesce((SELECT jsonb_agg(product_id ORDER BY product_id) FROM b2b_catalog WHERE tenant=t AND unit_id=k),'[]'))
   INTO s FROM b2b_units r WHERE tenant=t AND id=k;
 ELSIF kind='b2bQuote' THEN
  SELECT (to_jsonb(r)-'tenant') #- '{data,quote,token}' INTO s FROM b2b_quotes r WHERE tenant=t AND id=k;
 ELSIF kind='b2bList' THEN
  SELECT to_jsonb(r)-'tenant' INTO s FROM b2b_lists r WHERE tenant=t AND id=k;
 ELSIF kind='b2bApproval' THEN
  SELECT (to_jsonb(r)-'tenant') #- '{data,quote,token}' INTO s FROM b2b_approvals r WHERE tenant=t AND id=k;
 ELSE RETURN entity_history_snapshot_before_b2b(kind,t,k);
 END IF;
 RETURN s;
END $fn$;
DO $fn$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('b2b_companies','b2bCompany','id'),('b2b_units','b2bUnit','id'),('b2b_members','b2bUnit','unit_id'),
 ('b2b_catalog','b2bUnit','unit_id'),('b2b_quotes','b2bQuote','id'),('b2b_lists','b2bList','id'),('b2b_approvals','b2bApproval','id')) x(tab,kind,keycol)
 LOOP
  EXECUTE format('CREATE TRIGGER history_before BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION capture_entity_history(%L,%L)',item.tab,item.kind,item.keycol);
  EXECUTE format('CREATE TRIGGER history_after AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION capture_entity_history(%L,%L)',item.tab,item.kind,item.keycol);
 END LOOP;
END $fn$;
