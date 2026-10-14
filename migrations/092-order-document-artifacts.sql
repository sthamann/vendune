-- Provider-neutral immutable order documents reuse receipt ownership/RLS; labels are never public product media.
ALTER TABLE order_receipts ADD COLUMN content bytea;
ALTER TABLE order_receipts ADD COLUMN source_app text;
ALTER TABLE order_receipts ADD COLUMN customer_visible boolean NOT NULL DEFAULT true;
ALTER TABLE order_receipts ADD CONSTRAINT order_document_size CHECK (content IS NULL OR octet_length(content) BETWEEN 5 AND 2097152);
ALTER TABLE order_receipts ADD CONSTRAINT order_document_app_scope FOREIGN KEY(tenant,source_app) REFERENCES app_packages(tenant,id);
-- Use the existing aggregate app row/byte budget, including concurrent callback writes.
CREATE FUNCTION order_document_accounting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE shop text; target_app text; delta_rows bigint; delta_bytes bigint;
BEGIN
 shop := CASE WHEN TG_OP='DELETE' THEN OLD.tenant ELSE NEW.tenant END;
 target_app := CASE WHEN TG_OP='DELETE' THEN OLD.source_app ELSE NEW.source_app END;
 IF target_app IS NULL THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Imported order documents are immutable' USING ERRCODE='42501'; END IF;
 delta_rows := CASE WHEN TG_OP='INSERT' THEN 1 ELSE -1 END;
 delta_bytes := CASE WHEN TG_OP='INSERT' THEN octet_length(NEW.content)+octet_length(NEW.snapshot::text)+512 ELSE -(octet_length(OLD.content)+octet_length(OLD.snapshot::text)+512) END;
 UPDATE app_storage_usage SET rows=rows+delta_rows,bytes=bytes+delta_bytes,updated_at=now() WHERE tenant=shop AND app=target_app;
 IF NOT FOUND THEN RAISE EXCEPTION 'App storage quota is not initialized' USING ERRCODE='42501'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER order_document_quota AFTER INSERT OR UPDATE OR DELETE ON order_receipts FOR EACH ROW EXECUTE FUNCTION order_document_accounting();
