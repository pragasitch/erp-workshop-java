# Development image shared by the install, api, web and studio services.
# The source code is NOT copied in: it is bind-mounted from your machine (see compose.yaml).
#
# Carries both toolchains: Node/pnpm for web + e2e + the shared packages, and a
# JDK 21 + Maven for the Spring Boot API (apps/api-java).

# JDK 21 is lifted from the official Temurin image instead of apt, so the version
# is pinned and matches the host.
FROM eclipse-temurin:21-jdk AS jdk

FROM node:24-slim

# openssl + ca-certificates for TLS; the rest for a working JDK at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates maven \
  && rm -rf /var/lib/apt/lists/*

# Bring in JDK 21 from the Temurin stage and put it on PATH.
COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:$PATH"

# Keep in sync with "packageManager" in the root package.json.
RUN npm install -g pnpm@12.15.0

# pnpm's package store and Maven's repo live in named volumes so re-installs are fast.
ENV pnpm_config_store_dir=/pnpm/store \
  MAVEN_OPTS=-Dmaven.repo.local=/m2/repository \
  TURBO_TELEMETRY_DISABLED=1
RUN mkdir -p /pnpm/store /m2/repository /workspace \
  && chown -R node:node /pnpm /m2 /workspace

# Run as the non-root "node" user (uid 1000) so files created in the bind mount
# (node_modules, dist, target, migrations) are owned by you on Linux/WSL, not by root.
USER node
WORKDIR /workspace
