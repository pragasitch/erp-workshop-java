# AGENTS.md (apps/api-java)

Rules for `@erp/api-java` (Spring Boot 3, JDK 21, Maven, Spring Security, Spring
Data JPA, Flyway, springdoc). The [root AGENTS.md](../../AGENTS.md) still applies.

- **One package per feature** under `src/main/java/com/erp/api/<feature>/`
  (`<Feature>Controller`, DTOs, entity, repository). Register nothing by hand:
  Spring component-scans the `com.erp.api` package.
- **Java owns the contract.** Define routes with `@RestController` + `@GetMapping`/
  `@PostMapping` under the `/api` context path, and request/response shapes as
  `record` DTOs. Mark every non-null field `@Schema(requiredMode = REQUIRED)` so
  the generated TypeScript types are not optional. Reference:
  `src/main/java/com/erp/api/health/HealthController.java`.
- **After changing a route or DTO, regenerate the contract.** Start the app,
  save the spec (`curl localhost:3000/api/openapi > packages/contracts/openapi.json`),
  then `pnpm --filter @erp/contracts generate`. The web app depends on the result.
- **No hand-written validation duplicated in the web.** Validate input with Bean
  Validation annotations (`@Email`, `@NotBlank`, ...) on the DTO; the global
  handling turns a failure into a 400.
- **Database access** only through Spring Data JPA repositories. Schema changes
  are Flyway migrations in `src/main/resources/db/migration` (`V<n>__<desc>.sql`);
  never `ddl-auto` a change. `ddl-auto` stays `validate`.
- **Every route requires a signed-in user** (Spring Security, session cookie
  `JSESSIONID`). Make a route public in `SecurityConfig` with `permitAll()`,
  restrict with `hasRole("ADMIN")`, and read the user with
  `@AuthenticationPrincipal AppUserDetails principal` on the handler.
- **The global prefix is `/api`** (servlet context path). Controller paths don't
  repeat it.
- Tests are JUnit 5 under `src/test/java`, `@SpringBootTest` + `MockMvc`. See the
  `write-tests` skill. Build and test with `mvn -q -B -f apps/api-java/pom.xml verify`.
