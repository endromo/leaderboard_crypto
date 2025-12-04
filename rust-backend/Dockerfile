FROM rust:1.70-alpine as builder

# Install build dependencies
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app

# Copy dependency files
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates openssl libgcc

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/leaderboard-api .

# Copy migrations
COPY migrations ./migrations

# Create non-root user
RUN addgroup -g 1000 -S appuser && \
    adduser -u 1000 -S appuser -G appuser

USER appuser

EXPOSE 8080

ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["./leaderboard-api"]