//! Bounded reference capture uses the shared public-only DNS-pinned egress client; partial failures remain visible.
use crate::*;
use base64::Engine;
pub(super) async fn capture(v: &Value) -> Result<(Value, Vec<String>)> {
    let urls = v["urls"].as_array().cloned().unwrap_or_default();
    let images = v["images"].as_array().cloned().unwrap_or_default();
    if urls.len() > 3 || images.len() > 2 {
        return Err(bad("Use at most three URLs and two reference images"));
    }
    let mut results = vec![];
    let mut visual = vec![];
    for image in images {
        let image = image
            .as_str()
            .filter(|s| s.len() < 1400000)
            .ok_or(bad("Reference image exceeds 1 MiB"))?;
        let (prefix, data) = image.split_once(",").ok_or(bad("Image data required"))?;
        if ![
            "data:image/png;base64",
            "data:image/jpeg;base64",
            "data:image/webp;base64",
        ]
        .contains(&prefix)
        {
            return Err(bad("Use PNG, JPEG or WebP reference images"));
        }
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(|_| bad("Invalid reference image"))?;
        let format =
            image::guess_format(&bytes).map_err(|_| bad("Invalid reference image format"))?;
        if !matches!(
            format,
            image::ImageFormat::Png | image::ImageFormat::Jpeg | image::ImageFormat::WebP
        ) {
            return Err(bad("Invalid reference image format"));
        }
        let dimensions = image::ImageReader::with_format(std::io::Cursor::new(&bytes), format)
            .into_dimensions()
            .map_err(|_| bad("Invalid reference image dimensions"))?;
        if dimensions.0 == 0
            || dimensions.1 == 0
            || dimensions.0 > 8192
            || dimensions.1 > 8192
            || u64::from(dimensions.0) * u64::from(dimensions.1) > 16_000_000
        {
            return Err(bad(
                "Resize reference images to at most 16 megapixels and 8192 pixels per side",
            ));
        }
        results.push(
            json!({"kind":"image","digest":hash(image),"bytes":bytes.len(),"status":"provided"}),
        );
        visual.push(image.into());
    }
    for source in urls {
        let source = source
            .as_str()
            .filter(|s| s.len() <= 2000)
            .ok_or(bad("Invalid reference URL"))?;
        let result = capture_url(source).await;
        results.push(match result {Ok(text)=>json!({"url":source,"status":"partial","note":"Bounded HTML source, not a rendered screenshot; scripts and video playback were not captured","text":text}),Err(_)=>json!({"url":source,"status":"unavailable","note":"Reference could not be captured safely; upload a screenshot instead"})});
    }
    Ok((json!(results), visual))
}
async fn capture_url(source: &str) -> Result<String> {
    let url = reqwest::Url::parse(source).map_err(|_| bad("Invalid reference URL"))?;
    if !url.username().is_empty() || url.password().is_some() {
        return Err(bad("Reference credentials are forbidden"));
    }
    let mut response = apps::public_https_client(&url)
        .await?
        .get(url)
        .timeout(std::time::Duration::from_secs(8))
        .send()
        .await
        .map_err(|_| bad("Reference unavailable"))?;
    if !response.status().is_success()
        || !response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|s| s.contains("text/html"))
    {
        return Err(bad("Reference is not an HTML page"));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| bad("Reference interrupted"))?
    {
        if bytes.len() + chunk.len() > 65536 {
            break;
        }
        bytes.extend_from_slice(&chunk);
    }
    let html = String::from_utf8_lossy(&bytes);
    // This is model evidence only. Nothing in this source enters a DOM or is fetched as a dependency.
    Ok(html.chars().take(12000).collect())
}
