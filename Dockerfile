# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89

# ---- Stage 1: build the static site ----
# Digest-pinned for a reproducible, immutable build base. Renovate keeps the
# tag and the @sha256 digest in sync when a new node:20-alpine is published.
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app
# Pin pnpm to the exact version from package.json so the build never drifts to
# whatever version Corepack would otherwise default to.
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies against the committed lockfile first (better layer caching).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the fully static output into /app/build.
COPY . .
RUN pnpm build

# ---- Stage 2: serve with nginx as a non-root user ----
# Version- and digest-pinned for an immutable runtime base. Renovate keeps the
# tag and the @sha256 digest in sync when a new nginx:1.31-alpine-slim ships.
FROM nginx:1.31-alpine-slim@sha256:241b0d0fe06250e026e7a35a008d022c9a1d3bec19442d65cc33b84d0b5dd64d

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as an unprivileged user; give it ownership of the paths nginx reads or
# rewrites. The pid and temp files live in /tmp (writable by any user), so /run
# ownership no longer matters. Validate the config at build time.
RUN adduser -D -u 1001 app \
	&& chown -R app:app /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf \
	&& nginx -t \
	&& rm -rf /tmp/nginx.pid /tmp/nginx-client-body /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
	CMD wget -q -O- http://localhost:8080/ > /dev/null || exit 1
