-- Native company/customer binding searches use a bounded registered-customer lookup, not guest-order scans.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX customers_identity_lookup ON customers USING gin
 ((lower(email||' '||coalesce(profile->>'name','')||' '||coalesce(profile->>'firstName','')||' '||coalesce(profile->>'lastName','')||' '||coalesce(customer_number,''))) gin_trgm_ops);
