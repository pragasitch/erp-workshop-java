package com.erp.api.health;

/** Mirrors the old HealthCheckSchema. */
public record HealthCheck(String api, String database, String timestamp) {}
