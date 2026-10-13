-- Update only owned native-shop URLs; preserve identities, custom domains and bindings.
BEGIN;
WITH changed AS (
  UPDATE experience_shops
  SET data = jsonb_set(data::jsonb, '{storefrontUrl}',
    to_jsonb('https://' || (data::jsonb ->> 'tenant') || '.veyndo.ai/'))::text
  WHERE data::jsonb ->> 'kind' = 'commerce'
    AND data::jsonb ->> 'tenant' ~ '^[a-z][a-z0-9-]{1,46}[a-z0-9]$'
    AND data::jsonb ->> 'storefrontUrl' IN (
      'https://' || (data::jsonb ->> 'tenant') || '.vendune.ai/',
      'https://' || (data::jsonb ->> 'tenant') || '.sellm.ai/',
      'https://' || (data::jsonb ->> 'tenant') || '.sellama.ai/')
  RETURNING slug
)
SELECT count(*) AS updated_owned_native_shop_urls FROM changed;
COMMIT;
