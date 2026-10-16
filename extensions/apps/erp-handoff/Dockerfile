# Independent first-party service; build context is repository root, runtime contains no Python or commerce server.
FROM rust:1.96-bookworm AS build
WORKDIR /build
COPY Cargo.toml Cargo.lock LICENSE ./
COPY src ./src
COPY crates/ crates/
COPY extensions ./extensions
COPY migrations ./migrations
COPY fixtures ./fixtures
COPY reference/automation-registry.json ./reference/automation-registry.json
COPY reference/app-manifests ./reference/app-manifests
RUN cargo build --locked --release --bin erp-handoff
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/release/erp-handoff /usr/local/bin/erp-handoff
USER 65532:65532
EXPOSE 8797
ENTRYPOINT ["/usr/local/bin/erp-handoff"]
