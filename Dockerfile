# syntax=docker/dockerfile:1

# ---- Stage 1: build the static site ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Install dependencies against the committed lockfile first (better layer caching).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the fully static output into /app/build.
COPY . .
RUN pnpm build

# ---- Stage 2: serve with nginx as a non-root user ----
# Version-pinned so Renovate can track and update the base image.
FROM nginx:1.31-alpine-slim

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
