-- Lock only this subscriber schedule. A failed event does not block later work.
SELECT c.tenant FROM outbox_checkpoints c
WHERE c.subscriber=$1
 AND EXISTS(SELECT 1 FROM outbox o LEFT JOIN outbox_subscriber_failures f
  ON f.tenant=o.tenant AND f.event_id=o.id AND f.subscriber=c.subscriber
  WHERE o.tenant=c.tenant AND (o.subscriber_mask & SUBSCRIBER_BIT::smallint)=0
  AND o.delivered_at IS NULL AND o.payload_retired_at IS NULL
  AND NOT o.dispatch_requires_retry AND o.dispatch_not_before<=now()
  AND f.dead_letter_at IS NULL AND coalesce(f.available_at,'-infinity'::timestamptz)<=now())
 AND EXISTS(SELECT 1 FROM tenants live WHERE live.id=coalesce(
  (SELECT live_tenant FROM shop_environments WHERE tenant=c.tenant),c.tenant
 ) AND live.status='active')
ORDER BY c.served_order,c.tenant
LIMIT 1 FOR UPDATE OF c SKIP LOCKED
