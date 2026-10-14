-- An old contact email cannot prove review authorship or purchase; keep text/rating/moderation intact.
-- Do not guess a customer ID or assign historical guest reviews to a newly registered account.
UPDATE product_reviews SET verified=false WHERE verified AND position('@' in session)>0;
