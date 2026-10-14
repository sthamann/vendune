//! RFC 6238 authenticator codes, bounded clock drift and constant-time comparison.
use ring::{
    hmac,
    rand::{SecureRandom, SystemRandom},
};
pub(super) fn secret() -> Result<String, &'static str> {
    let mut bytes = [0u8; 20];
    SystemRandom::new()
        .fill(&mut bytes)
        .map_err(|_| "Random source unavailable")?;
    Ok(encode(&bytes))
}
fn encode(bytes: &[u8]) -> String {
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut out = String::new();
    let (mut buffer, mut bits) = (0u32, 0u32);
    for byte in bytes {
        buffer = (buffer << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            out.push(alphabet[((buffer >> bits) & 31) as usize] as char);
        }
    }
    if bits > 0 {
        out.push(alphabet[((buffer << (5 - bits)) & 31) as usize] as char);
    }
    out
}
fn decode(secret: &str) -> Option<Vec<u8>> {
    if secret.len() != 32 {
        return None;
    }
    let (mut buffer, mut bits) = (0u32, 0u32);
    let mut out = Vec::new();
    for b in secret.bytes() {
        let n = match b {
            b'A'..=b'Z' => b - b'A',
            b'2'..=b'7' => b - b'2' + 26,
            _ => return None,
        };
        buffer = (buffer << 5) | u32::from(n);
        bits += 5;
        if bits >= 8 {
            bits -= 8;
            out.push((buffer >> bits) as u8);
        }
    }
    Some(out)
}
fn hotp(secret: &[u8], step: i64, digits: u32) -> String {
    let key = hmac::Key::new(hmac::HMAC_SHA1_FOR_LEGACY_USE_ONLY, secret);
    let mac = hmac::sign(&key, &step.to_be_bytes());
    let b = mac.as_ref();
    let offset = usize::from(b[19] & 15);
    let n = u32::from_be_bytes(b[offset..offset + 4].try_into().unwrap()) & 0x7fff_ffff;
    format!("{:0width$}", n % 10u32.pow(digits), width = digits as usize)
}
pub(super) fn matched(secret: &str, code: &str, seconds: i64, previous: i64) -> Option<i64> {
    if code.len() != 6 || !code.bytes().all(|c| c.is_ascii_digit()) || seconds < 30 {
        return None;
    }
    let secret = decode(secret)?;
    let current = seconds / 30;
    [current, current - 1, current + 1]
        .into_iter()
        .find(|step| {
            *step > previous
                && hmac::verify(
                    &hmac::Key::new(hmac::HMAC_SHA256, &secret),
                    code.as_bytes(),
                    hmac::sign(
                        &hmac::Key::new(hmac::HMAC_SHA256, &secret),
                        hotp(&secret, *step, 6).as_bytes(),
                    )
                    .as_ref(),
                )
                .is_ok()
        })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rfc6238_sha1_vectors_and_replay_fence() {
        let key = b"12345678901234567890";
        for (seconds, expected) in [
            (59, "94287082"),
            (1111111109, "07081804"),
            (1111111111, "14050471"),
            (1234567890, "89005924"),
            (2000000000, "69279037"),
            (20000000000, "65353130"),
        ] {
            assert_eq!(hotp(key, seconds / 30, 8), expected);
        }
        let secret = encode(key);
        assert_eq!(decode(&secret).unwrap(), key);
        assert_eq!(matched(&secret, "287082", 59, -1), Some(1));
        assert_eq!(matched(&secret, "287082", 59, 1), None);
        assert_eq!(matched(&secret, "287082", 150, -1), None);
        assert_eq!(matched(&secret, " 287082", 59, -1), None);
        assert_eq!(matched("invalid", "287082", 59, -1), None);
    }
}
