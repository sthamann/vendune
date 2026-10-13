-- Add approved domain aliases without replacing a merchant or its existing hostname.
BEGIN;
LOCK TABLE merchant_hostnames IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM merchant_hostnames old
    JOIN merchant_hostnames current ON current.hostname = regexp_replace(old.hostname, '\.(vendune|sellm|sellama)\.ai$', '.veyndo.ai')
    WHERE old.hostname ~ '^[a-z][a-z0-9-]*\.(vendune|sellm|sellama)\.ai$'
      AND current.merchant_id <> old.merchant_id
  ) OR EXISTS (
    SELECT regexp_replace(hostname, '\.(vendune|sellm|sellama)\.ai$', '.veyndo.ai')
    FROM merchant_hostnames
    WHERE hostname ~ '^[a-z][a-z0-9-]*\.(vendune|sellm|sellama)\.ai$'
    GROUP BY 1 HAVING count(DISTINCT merchant_id) > 1
  ) THEN RAISE EXCEPTION 'Conflicting native hostname ownership'; END IF;
END $$;
WITH inserted AS (
 INSERT INTO merchant_hostnames(hostname,merchant_id,kind)
 SELECT DISTINCT regexp_replace(hostname, '\.(vendune|sellm|sellama)\.ai$', '.veyndo.ai'), merchant_id, kind
 FROM merchant_hostnames
 WHERE hostname ~ '^[a-z][a-z0-9-]*\.(vendune|sellm|sellama)\.ai$'
 ON CONFLICT (hostname) DO NOTHING
 RETURNING hostname
)
SELECT count(*) AS added_owned_native_hostnames FROM inserted;
COMMIT;
