-- One native owner, one channel and a current affirmative receipt; expired observations never contribute.
SELECT e.* FROM session_signal_events e
JOIN privacy_consents c ON c.tenant=e.tenant AND c.cart_id=e.cart_id AND c.channel_id=e.channel_id
WHERE e.tenant=$1 AND e.channel_id=$2 AND e.purpose='analytics'
 AND e.created_at>=now()-make_interval(days=>$3) AND e.expires_at>now()
 AND c.expires_at>now() AND c.policy_version=$4 AND c.data->'choices'->>'analytics'='true'
