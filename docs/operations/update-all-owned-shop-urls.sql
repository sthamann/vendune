-- Update only exact owned shop URLs; preserve aliases, tenants, channels and renderer selection.
BEGIN;
WITH changed AS (
  UPDATE experience_shops
  SET data = jsonb_set(data::jsonb, '{storefrontUrl}',
    to_jsonb(regexp_replace(data::jsonb ->> 'storefrontUrl',
      '\.(vendune|sellm|sellama)\.ai/$', '.veyndo.ai/')))::text
  WHERE slug ~ '^[a-z][a-z0-9-]{1,46}[a-z0-9]$'
    AND data::jsonb ->> 'storefrontUrl' IN (
      'https://' || slug || '.vendune.ai/',
      'https://' || slug || '.sellm.ai/',
      'https://' || slug || '.sellama.ai/',
      'https://' || (data::jsonb ->> 'tenant') || '.vendune.ai/',
      'https://' || (data::jsonb ->> 'tenant') || '.sellm.ai/',
      'https://' || (data::jsonb ->> 'tenant') || '.sellama.ai/')
  RETURNING slug
)
SELECT count(*) AS updated_owned_shop_urls FROM changed;
COMMIT;
