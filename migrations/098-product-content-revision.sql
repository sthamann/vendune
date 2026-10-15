-- A new content clock starts at one; preserve the deployed aggregate CAS and stock.
ALTER TABLE products ADD COLUMN content_revision bigint NOT NULL DEFAULT 1 CHECK(content_revision>=0);

-- Existing replicas advance this clock throughout a rolling release. Translation-only
-- saves advance revision even when the base-language row itself is unchanged.
CREATE FUNCTION product_content_clock() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF NEW.revision IS DISTINCT FROM OLD.revision THEN
  IF NEW.stock IS NOT DISTINCT FROM OLD.stock OR
     (to_jsonb(NEW)-ARRAY['stock','revision','content_revision']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['stock','revision','content_revision']) THEN
   NEW.content_revision:=OLD.content_revision+1;
  ELSE
   NEW.content_revision:=OLD.content_revision;
  END IF;
 END IF;
 RETURN NEW;
END;
$fn$;
CREATE TRIGGER product_content_clock BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION product_content_clock();
