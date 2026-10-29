package com.erp.api.health;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/health. Same JSON shape as the old NestJS health route. */
@Tag(name = "health")
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Operation(operationId = "check", summary = "Check that the API and the database are reachable")
    @GetMapping("/health")
    public HealthCheck check() {
        String database;
        try (var conn = dataSource.getConnection();
                var stmt = conn.prepareStatement("SELECT 1")) {
            stmt.executeQuery();
            database = "ok";
        } catch (Exception e) {
            database = "error";
        }
        return new HealthCheck("ok", database, Instant.now().toString());
    }
}
