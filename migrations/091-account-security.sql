-- Personal MFA is operational identity state: never cloned or released with shop configuration.
ALTER TABLE merchant_users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE merchant_users ADD COLUMN credential_revision bigint NOT NULL DEFAULT 0;
CREATE TABLE merchant_mfa (
 user_id text PRIMARY KEY REFERENCES merchant_users(id) ON DELETE CASCADE,
 ciphertext text, enabled boolean NOT NULL DEFAULT false,
 pending_ciphertext text, pending_expires_at timestamptz,
 revision bigint NOT NULL DEFAULT 0, last_step bigint NOT NULL DEFAULT -1,
 recovery_digests jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT enabled OR ciphertext IS NOT NULL)
);
CREATE TABLE merchant_mfa_challenges (
 digest text PRIMARY KEY, user_id text NOT NULL REFERENCES merchant_users(id) ON DELETE CASCADE,
 tenant text NOT NULL REFERENCES tenants(id), attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE INDEX merchant_mfa_challenge_expiry ON merchant_mfa_challenges(expires_at);
ALTER TABLE merchant_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_mfa FORCE ROW LEVEL SECURITY;
CREATE POLICY identity_system ON merchant_mfa USING(current_setting('rac.system',true)='on') WITH CHECK(current_setting('rac.system',true)='on');
ALTER TABLE merchant_mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_mfa_challenges FORCE ROW LEVEL SECURITY;
CREATE POLICY core_tenant_scope ON merchant_mfa_challenges USING(current_setting('rac.system',true)='on') WITH CHECK(current_setting('rac.system',true)='on');
-- A handoff transfers an existing personal session; integration keys cannot mint one.
ALTER TABLE merchant_handoffs ADD COLUMN session_digest text REFERENCES user_sessions(digest) ON DELETE CASCADE;
