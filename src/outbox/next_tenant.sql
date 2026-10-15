-- Lock scheduling metadata only: locking the tenant root would block ordinary FK inserts.
-- Other replicas skip the busy tenant; least recently served precedes older noisy event IDs.
SELECT dispatch.tenant FROM outbox_tenant_dispatch dispatch
WHERE EXISTS (
 SELECT 1 FROM outbox o WHERE o.tenant=dispatch.tenant AND o.delivered_at IS NULL
  AND o.dead_letter_at IS NULL AND o.available_at<=now()
) AND EXISTS (
 SELECT 1 FROM tenants live WHERE live.id=coalesce(
  (SELECT live_tenant FROM shop_environments WHERE tenant=dispatch.tenant),dispatch.tenant
 ) AND live.status='active'
)
ORDER BY dispatch.served_order,dispatch.tenant
LIMIT 1 FOR UPDATE OF dispatch SKIP LOCKED
