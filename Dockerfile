# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

# ---- Stage 1: build the static site ----
# Digest-pinned for a reproducible, immutable build base. Renovate keeps the
# tag and the @sha256 digest in sync when a new node:24-alpine is published.
FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS builder
WORKDIR /app

# Install dependencies against the committed lockfile first (better layer caching).
COPY package.json pnpm-lock.yaml ./
# Activate the exact pnpm version from package.json's `packageManager` field
# (hence after the COPY): a version hardcoded here drifts silently every time
# Renovate bumps that field, and the build would then run on a pnpm the
# lockfile was not written by.
RUN corepack enable && corepack prepare --activate
RUN pnpm install --frozen-lockfile

# Build the fully static output into /app/build.
COPY . .
RUN pnpm build

# ---- Stage 2: serve with nginx as a non-root user ----
# Version- and digest-pinned for an immutable runtime base. Renovate keeps the
# tag and the @sha256 digest in sync when a new nginx:1.31-alpine-slim ships.
FROM nginx:1.31-alpine-slim@sha256:1870de6d59aafee152589b64404556d2535922cdd998e6dac1c4888c938ed8f9

# Alpine ships a security fix before the nginx image is rebuilt around it, and
# the scan gate reads the image, not the calendar: 1.31.4-alpine-slim is the
# newest tag there is and it still carries openssl 3.5.7-r0, vulnerable to
# CVE-2026-14456. Upgrading the two packages by name keeps the rest of the base
# pinned to its digest. Drop this once an nginx:1.31-alpine-slim ships openssl
# 3.5.8-r0 or later.
RUN apk upgrade --no-cache libcrypto3 libssl3

# OCI image metadata. The defaults make a local `docker build` self-describing;
# CI overrides SOURCE_URL/VCS_REF/BUILD_DATE with the real repository, commit
# SHA and build timestamp via --build-arg.
ARG SOURCE_URL=https://github.com/youkyi/pki-toolbox
ARG VCS_REF=local
ARG BUILD_DATE=
LABEL org.opencontainers.image.title="pki-toolbox" \
	org.opencontainers.image.description="Self-hosted, 100% client-side PKI artefact decoder (X.509, CSR, chains, CRL, PKCS#7/#12, ASN.1) with self-signed certificate generation." \
	org.opencontainers.image.source="$SOURCE_URL" \
	org.opencontainers.image.url="$SOURCE_URL" \
	org.opencontainers.image.documentation="$SOURCE_URL#readme" \
	org.opencontainers.image.licenses="MIT" \
	org.opencontainers.image.revision="$VCS_REF" \
	org.opencontainers.image.created="$BUILD_DATE"

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
