package com.erp.api.health;

import java.time.Instant;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/health. Same JSON shape as the old NestJS health route. */
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public Map<String, String> check() {
        String database;
        try (var conn = dataSource.getConnection();
                var stmt = conn.prepareStatement("SELECT 1")) {
            stmt.executeQuery();
            database = "ok";
        } catch (Exception e) {
            database = "error";
        }
        return Map.of(
                "api", "ok",
                "database", database,
                "timestamp", Instant.now().toString());
    }
}
