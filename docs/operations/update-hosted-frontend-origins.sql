-- Domain configuration maintenance after the verified VEYNDO release and backup.
-- Preserve aliases, tenant/channel ownership, app bindings and presentation identity.
BEGIN;
SELECT set_config('rac.system', 'on', true);
SELECT set_config('veyndo.source', 'operator-domain-migration', true);
SELECT set_config('veyndo.reason', 'Move owned Experience mounts to veyndo.ai', true);
WITH changed AS (
  UPDATE hosted_frontends
  SET origin = 'https://experience.veyndo.ai', revision = revision + 1
  WHERE origin IN (
    'https://experience.vendune.ai',
    'https://experience.sellm.ai',
    'https://experience.sellama.ai'
  )
  RETURNING tenant
), notifications AS (
  SELECT pg_notify('veyndo_read_invalidation', json_build_object('tenant', tenant)::text)
  FROM (SELECT DISTINCT tenant FROM changed) owned
)
SELECT (SELECT count(*) FROM changed) AS updated_mounts,
       (SELECT count(*) FROM notifications) AS invalidated_tenants;
COMMIT;
