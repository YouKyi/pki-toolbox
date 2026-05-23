# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89

# ---- Stage 1: build the static site ----
# Digest-pinned for a reproducible, immutable build base. Renovate keeps the
# tag and the @sha256 digest in sync when a new node:20-alpine is published.
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS builder
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
FROM nginx:1.31-alpine-slim@sha256:3fe7a344f234ac4b84817896c9294ffae74eae03fc1ad0ff502457fef5cebef8

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
