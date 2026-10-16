//! Bounded UTF-8 CSV parser accepts quoted delimiters, escaped quotes and multiline fields; no formula evaluation or silent row loss.
use super::*;
pub(super) fn parse(source: &str) -> Result<Vec<Draft>> {
    let source = source.trim_start_matches('\u{feff}');
    let line = source.lines().next().unwrap_or_default();
    let sep = if line.matches(';').count() > line.matches(',').count() {
        ';'
    } else {
        ','
    };
    let mut cells = vec![];
    let mut rows = vec![];
    let mut cell = String::new();
    let mut quoted = false;
    let mut closed = false;
    let mut chars = source.chars().peekable();
    while let Some(ch) = chars.next() {
        if quoted {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    cell.push('"');
                } else {
                    quoted = false;
                    closed = true;
                }
            } else {
                cell.push(ch);
            }
        } else if ch == '"' && cell.is_empty() && !closed {
            quoted = true;
        } else if ch == sep || ch == '\n' || ch == '\r' {
            cells.push(std::mem::take(&mut cell));
            closed = false;
            if ch != sep {
                if ch == '\r' && chars.peek() == Some(&'\n') {
                    chars.next();
                }
                if cells.iter().any(|c| !c.trim().is_empty()) {
                    rows.push(std::mem::take(&mut cells));
                } else {
                    cells.clear();
                }
                if rows.len() > 51 {
                    return Err(bad("CSV supports at most 50 products per reviewed batch"));
                }
            }
        } else if closed {
            return Err(bad("CSV has text after a closing quote"));
        } else {
            cell.push(ch);
        }
    }
    if quoted {
        return Err(bad("CSV has an unclosed quoted field"));
    }
    cells.push(cell);
    if cells.iter().any(|c| !c.trim().is_empty()) {
        rows.push(cells);
    }
    if rows.len() < 2 || rows.len() > 51 {
        return Err(bad("CSV needs a header and 1..50 products"));
    }
    let headers = rows
        .remove(0)
        .iter()
        .map(|s| s.trim().to_string())
        .collect::<Vec<_>>();
    let allowed = ["name", "description", "price", "productNumber", "imageUrl"];
    if !["name", "price"]
        .iter()
        .all(|h| headers.iter().any(|k| k == h))
        || headers.iter().any(|h| !allowed.contains(&h.as_str()))
        || headers
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
            != headers.len()
    {
        return Err(bad(
            "CSV headers: name,price required; description,productNumber,imageUrl optional",
        ));
    }
    rows.iter()
        .enumerate()
        .map(|(index, row)| {
            if row.len() != headers.len() {
                return Err(Error::validation(
                    &format!("/catalogIntake/rows/{}", index + 2),
                    "CSV row has the wrong number of columns".into(),
                ));
            }
            let get = |key: &str| {
                headers
                    .iter()
                    .position(|h| h == key)
                    .map(|i| row[i].trim().to_string())
                    .unwrap_or_default()
            };
            let raw = get("price");
            let price = raw.replace(',', ".").parse::<f64>().map_err(|_| {
                Error::validation(
                    &format!("/catalogIntake/rows/{}", index + 2),
                    "CSV row has an invalid price".into(),
                )
            })?;
            let d = Draft {
                name: get("name"),
                description: get("description"),
                price,
                product_number: get("productNumber"),
                image_url: get("imageUrl"),
            };
            d.validate().map_err(|e| {
                Error::validation(&format!("/catalogIntake/rows/{}", index + 2), e.1)
            })?;
            Ok(d)
        })
        .collect()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quotes_bom_and_decimal_comma() {
        let d=parse("\u{feff}name;price;description\r\n\"Oak; chair\";\"19,90\";\"Line 1\nLine \"\"2\"\"\"\r\n").unwrap();
        assert_eq!(d[0].price, 19.9);
        assert_eq!(d[0].description, "Line 1\nLine \"2\"");
        assert_eq!(d[0].name, "Oak; chair");
    }
    #[test]
    fn rejects_bad_csv_without_partial_success() {
        for s in [
            "name,price\na,1\nb,no",
            "name,price\n\"open,3",
            "name,name,price\na,b,2",
            "name,price\na,NaN",
            "name,price\n\"a\"oops,1",
        ] {
            assert!(parse(s).is_err(), "{s}");
        }
        assert!(parse(&format!("name,price\n{}", "chair,1\n".repeat(51))).is_err());
    }
}
