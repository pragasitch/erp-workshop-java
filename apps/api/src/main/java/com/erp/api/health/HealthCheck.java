package com.erp.api.health;

import io.swagger.v3.oas.annotations.media.Schema;

/** Mirrors the old HealthCheckSchema. */
public record HealthCheck(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String api,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String database,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String timestamp) {}
