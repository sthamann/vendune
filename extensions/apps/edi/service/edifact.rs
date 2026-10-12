//! Bounded EDIFACT ORDERS profile with release-aware tokenization and checked message/interchange envelopes.
use super::document::{Document, Line, Result, quantity};
type Seg = Vec<Vec<String>>;
fn atom(s: &Seg, e: usize, c: usize) -> &str {
    s.get(e)
        .and_then(|v| v.get(c))
        .map(String::as_str)
        .unwrap_or("")
}
fn tokenize(input: &str) -> Result<Vec<Seg>> {
    let (seps, body) = if input.starts_with("UNA") {
        if !input.is_ascii() || input.len() < 9 {
            return Err("Invalid UNA service advice".into());
        }
        let b = input.as_bytes();
        (
            [
                b[3] as char,
                b[4] as char,
                b[5] as char,
                b[6] as char,
                b[8] as char,
            ],
            &input[9..],
        )
    } else {
        ([':', '+', '.', '?', '\''], input)
    };
    if seps[2] != '.' || seps.iter().enumerate().any(|(i, c)| seps[..i].contains(c)) {
        return Err("Unsupported decimal mark or ambiguous separators".into());
    }
    let mut result = Vec::new();
    let mut seg = vec![vec![String::new()]];
    let mut escape = false;
    for c in body.chars() {
        if escape {
            seg.last_mut().unwrap().last_mut().unwrap().push(c);
            escape = false;
            continue;
        }
        if c == seps[3] {
            escape = true;
            continue;
        }
        if c == seps[4] {
            if seg[0][0].trim().is_empty() {
                return Err("Empty EDIFACT segment".into());
            }
            seg[0][0] = seg[0][0].trim().into();
            result.push(seg);
            seg = vec![vec![String::new()]];
            if result.len() > 1000 {
                return Err("Segment limit exceeded".into());
            }
        } else if c == seps[1] {
            seg.push(vec![String::new()]);
        } else if c == seps[0] {
            seg.last_mut().unwrap().push(String::new());
        } else if c == '\n' || c == '\r' {
            if !seg[0][0].is_empty() {
                return Err("Unexpected line break inside a segment".into());
            }
        } else if c.is_control() {
            return Err("Control character in EDIFACT".into());
        } else {
            let v = seg.last_mut().unwrap().last_mut().unwrap();
            v.push(c);
            if v.len() > 256 {
                return Err("Component exceeds 256 characters".into());
            }
        }
    }
    if escape || seg.iter().flatten().any(|v| !v.trim().is_empty()) {
        return Err("Truncated EDIFACT segment".into());
    }
    Ok(result)
}
pub fn parse(input: &str) -> Result<Document> {
    let s = tokenize(input)?;
    if s.len() < 6
        || atom(&s[0], 0, 0) != "UNB"
        || atom(s.last().unwrap(), 0, 0) != "UNZ"
        || atom(&s[0], 1, 0) != "UNOC"
        || atom(&s[0], 1, 1) != "3"
    {
        return Err("Expected one UNOC:3 interchange".into());
    }
    if atom(s.last().unwrap(), 1, 0) != "1" || atom(s.last().unwrap(), 2, 0) != atom(&s[0], 5, 0) {
        return Err("UNZ count/reference differs from UNB".into());
    }
    if atom(&s[1], 0, 0) != "UNH"
        || atom(&s[1], 2, 0) != "ORDERS"
        || atom(&s[1], 2, 1) != "D"
        || !["96A", "23A"].contains(&atom(&s[1], 2, 2))
        || atom(&s[1], 2, 3) != "UN"
    {
        return Err("Supported message profiles are ORDERS:D:96A:UN and ORDERS:D:23A:UN".into());
    }
    let end = &s[s.len() - 2];
    if atom(end, 0, 0) != "UNT"
        || atom(end, 1, 0).parse::<usize>().ok() != Some(s.len() - 2)
        || atom(end, 2, 0) != atom(&s[1], 1, 0)
    {
        return Err("UNT count/reference mismatch".into());
    }
    let mut d = Document {
        number: String::new(),
        sender: atom(&s[0], 2, 0).into(),
        receiver: atom(&s[0], 3, 0).into(),
        currency: String::new(),
        lines: vec![],
    };
    let mut current: Option<Line> = None;
    let mut bgm = false;
    let mut cux = false;
    for v in &s[2..s.len() - 2] {
        match atom(v, 0, 0) {
            "BGM" => {
                if bgm || atom(v, 1, 0) != "220" || atom(v, 3, 0) != "9" {
                    return Err(
                        "Only original purchase orders (BGM 220 / function 9) are supported".into(),
                    );
                }
                bgm = true;
                d.number = atom(v, 2, 0).into();
            }
            "CUX" => {
                if cux || atom(v, 1, 0) != "2" || atom(v, 1, 2) != "9" {
                    return Err("Expected one order currency CUX 2:ISO:9".into());
                }
                cux = true;
                d.currency = atom(v, 1, 1).into();
            }
            "LIN" => {
                if let Some(l) = current.take() {
                    d.lines.push(l);
                }
                if atom(v, 3, 1) != "SA" {
                    return Err("LIN supplier article number (SA) required".into());
                }
                current = Some(Line {
                    sku: atom(v, 3, 0).into(),
                    quantity: 0,
                });
            }
            "QTY" => {
                let l = current.as_mut().ok_or("QTY requires LIN")?;
                if atom(v, 1, 0) != "21"
                    || !["", "PCE", "EA"].contains(&atom(v, 1, 2))
                    || l.quantity != 0
                {
                    return Err("Only one QTY 21 per whole-unit line is supported".into());
                }
                l.quantity = quantity(atom(v, 1, 1))?;
            }
            "UNS" => {
                if atom(v, 1, 0) != "S" {
                    return Err("Invalid summary separator".into());
                }
            }
            "CNT" => {
                if atom(v, 1, 0) != "2"
                    || atom(v, 1, 1).parse::<usize>().ok()
                        != Some(d.lines.len() + usize::from(current.is_some()))
                {
                    return Err("Line control total mismatch".into());
                }
            }
            "DTM" => {
                if atom(v, 1, 0) != "137"
                    || atom(v, 1, 2) != "102"
                    || chrono::NaiveDate::parse_from_str(atom(v, 1, 1), "%Y%m%d").is_err()
                {
                    return Err("Unsupported order date".into());
                }
            }
            tag => {
                return Err(format!(
                    "Unsupported ORDERS segment {tag}; configure a partner profile instead of discarding terms"
                ));
            }
        }
    }
    if let Some(l) = current {
        d.lines.push(l);
    }
    if !bgm || !cux {
        return Err("Order number/currency required".into());
    }
    d.validate()
}
#[cfg(test)]
mod tests {
    use super::*;
    const GOOD: &str = include_str!("../fixtures/order.edi");
    #[test]
    fn envelope_and_release() {
        let d = parse(GOOD).unwrap();
        assert_eq!(d.lines[0].sku, "SKU+LAMP");
        assert_eq!(d.lines[0].quantity, 2);
        assert!(parse(&GOOD.replace("UNT+8+1", "UNT+9+1")).is_err());
        assert!(parse(&GOOD.replace("QTY+21:2", "QTY+21:2.5")).is_err());
        assert!(parse(&GOOD.replace("UNZ+1+ABC", "UNZ+2+ABC")).is_err());
    }
    #[test]
    fn unsupported_terms_not_silently_lost() {
        assert!(parse(&GOOD.replace("DTM+137:20261012:102'", "PAT+3'")).is_err());
    }
}
