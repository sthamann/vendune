-- Declared app settings reuse encrypted per-tenant/app credentials; no second settings ledger.
ALTER TABLE app_service_secrets DROP CONSTRAINT app_service_secrets_kind_check;
ALTER TABLE app_service_secrets ADD CONSTRAINT app_service_secrets_kind_check CHECK(kind IN ('service','webhook','outbound','settings'));
