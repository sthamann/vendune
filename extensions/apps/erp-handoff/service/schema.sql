-- Apply once with the operator migration role; grant only this app table to a separate non-owner runtime role.
CREATE TABLE IF NOT EXISTS public.erp_handoff_receipts (
 tenant text NOT NULL, order_id text NOT NULL, state text NOT NULL CHECK (state IN ('running','accepted','failed','uncertain')),
 payload jsonb NOT NULL, idempotency_key text NOT NULL, external_receipt text, detail text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant,order_id), UNIQUE (tenant,idempotency_key)
);
ALTER TABLE public.erp_handoff_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_handoff_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erp_tenant ON public.erp_handoff_receipts;
CREATE POLICY erp_tenant ON public.erp_handoff_receipts USING (tenant=current_setting('app.tenant',true)) WITH CHECK (tenant=current_setting('app.tenant',true));
