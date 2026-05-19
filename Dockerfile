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
FROM nginx:alpine-slim

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as an unprivileged user; give it ownership of the paths nginx writes to
# (cache, logs, and /run for the pid file).
RUN adduser -D -u 1001 app \
	&& chown -R app:app /var/cache/nginx /var/log/nginx /run /usr/share/nginx/html /etc/nginx/conf.d

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
	CMD wget -q -O- http://localhost:8080/ > /dev/null || exit 1
