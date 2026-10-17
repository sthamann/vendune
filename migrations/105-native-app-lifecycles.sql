-- Native quote preparation states are namespaced, bounded identifiers. Offer/accept/order
-- settlement still belongs exclusively to the existing native RFQ/checkout owners.
ALTER TABLE b2b_quotes DROP CONSTRAINT b2b_quotes_state_check;
ALTER TABLE b2b_quotes ADD CONSTRAINT b2b_quotes_state_check CHECK (
 state IN ('requested','offered','accepted','ordered','rejected')
 OR state ~ '^a[0-9a-f]{8}_[a-z][a-z0-9_]{0,15}$'
);
