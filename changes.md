# Changes: Migrate backend to Java (Spring Boot + Maven + JUnit)

Plan to replace the TypeScript backend with a Java one, while keeping the web
app and e2e tests on their current technology. This document is the agreed scope
and impact analysis. No code has been changed yet (only `JAVA_HOME` was set in
`~/.bashrc`, outside the repo).

## Decisions (agreed)

- **Greenfield, no data migration.** Fresh database, reseed from scratch. No need
  to preserve existing password hashes or session cookies.
- **Auth:** Spring Security + `BCryptPasswordEncoder` + standard server-side
  session handling (`JSESSIONID`). The hand-rolled scrypt hashing and HMAC
  session token are dropped.
- **IDs:** `User.id` becomes a UUID (idiomatic for JPA). No cuid.
- **Contract source of truth:** Java owns the API shape. `springdoc-openapi`
  generates the OpenAPI spec; the TypeScript client in `packages/contracts` is
  generated from that spec (direction flips from TS to Java).

Because of the greenfield decision, the scrypt/HMAC/cuid byte-compatibility
risks from the earlier analysis no longer apply.

## Target stack

| Layer | From | To |
| --- | --- | --- |
| Framework | NestJS 12 (ESM, Node >=24) | Spring Boot 3.x (JDK 21) |
| Build | pnpm + Turbo + tsc | Maven |
| Tests | Vitest (`*.spec.ts`) | JUnit 5 + `@SpringBootTest` / `MockMvc` |
| Lint | ESLint | Checkstyle / PMD (optional) |
| API routing | oRPC `@Implement(contract...)` | `@RestController`, paths under `/api` |
| Validation | Zod schemas (from contract) | Bean Validation (`@Email`, `@NotBlank`, ...) |
| Auth | custom `AuthGuard` + HMAC cookie | Spring Security, session cookie, BCrypt |
| ORM | Prisma 7 + driver adapter | Spring Data JPA / Hibernate (or jOOQ) |
| Migrations | Prisma migrate | Flyway |
| OpenAPI | `@orpc/openapi` generator | springdoc-openapi |
| Contract (TS) | hand-written oRPC + Zod | generated from OpenAPI spec |

## What gets replaced

- `apps/api` (NestJS) -> Spring Boot app built by Maven.
  - `src/health/*` -> health `@RestController` (`/api/health`).
  - `src/auth/*` (controller, guard, decorators, session-token) -> Spring
    Security config + auth `@RestController`. `@Public` -> `permitAll()`,
    `@Roles('ADMIN')` -> `hasRole("ADMIN")`, `@CurrentUser` ->
    `@AuthenticationPrincipal`.
  - `src/config/env.ts` (Zod) -> `application.yaml` + `@ConfigurationProperties`.
  - `src/openapi/*` -> springdoc (serves `/api/docs`, `/api/openapi.json`).
  - `src/database/prisma.service.ts` -> JPA `EntityManager` / repositories.
- `packages/database` (Prisma) -> JPA `User` entity + `Role` enum + Flyway
  migration + seed (via `CommandLineRunner` or seed migration). `password.ts`
  scrypt logic removed (BCrypt instead).
- `packages/contracts` -> becomes **generated** output. Build step reads the
  committed `openapi.json` and runs the TS generator (Orval recommended, to keep
  the TanStack Query hooks the web app uses; `openapi-typescript` + `openapi-fetch`
  as the minimal alternative).

## What stays (largely) the same

- `apps/web` React code — unchanged in substance. Only `src/lib/orpc.ts` is
  swapped from the oRPC client to the generated client, same call sites.
- `apps/e2e` Playwright tests — unchanged if HTTP behavior (paths, JSON, login
  flow, status codes) matches.
- `vite.config.ts` proxy — still forwards `/api` to the backend; only the target
  port/command changes.

## OpenAPI / contract flow

1. Java controllers + DTOs + Bean Validation define the shape.
2. springdoc exposes `/api/openapi.json` and `/api/docs` at runtime.
3. The spec is exported to a committed `openapi.json` (via
   `springdoc-openapi-maven-plugin` or a script) so web/e2e builds are
   deterministic and don't need the Java server running.
4. `packages/contracts` build regenerates the TS client from that spec.
5. `apps/web` consumes the generated client.

## Repository / tooling impact

| File / area | Change needed | Used by lesson |
| --- | --- | --- |
| `AGENTS.md` (root) | Rewrite backend description for Java stack | all |
| `apps/api/AGENTS.md` | Rewrite rules for Spring Boot/JPA/springdoc | all |
| `CLAUDE.md` | Follow AGENTS.md rewrite | all |
| `apps/api/package.json` + configs | Replace with Maven `pom.xml` (or wrap Maven behind a thin `package.json` so Turbo can still call it) | all |
| `packages/database` | Replace Prisma with JPA + Flyway, or keep Prisma only for migrations (decide) | all |
| `packages/contracts` build | Generate from OpenAPI spec instead of hand-authored | 4, 7 |
| `docker/dev.Dockerfile` | Add a JDK 21 stage for the api service | 1, 7, 9, 10 |
| `compose.yaml` | Change api service build/run command to the Java app | 7, 9, 10 |
| `.github/workflows/ci.yml` | Run Maven (compile/test/package) alongside/instead of `turbo` | 7, 8 |
| `scripts/implement-frontier.sh` | Replace Prisma reset (`prisma migrate reset`) with Flyway/Maven reset; adjust preflight (currently requires `pnpm`, `docker`, `jq`) | 9 |
| `.kiro/skills/implement`, `tdd`, `code-review` | Test cadence is TS (`tsc` + Vitest); retarget to `mvn compile` + JUnit | 7, 9 |
| `.kiro/skills/implement-ticket` | Same retarget; references TS seams | 7, 9 |
| `apps/e2e/playwright.config.ts` | `webServer` starts NestJS (`pnpm --filter @erp/api start`); change to Spring Boot start command | 10 |
| `turbo.json` | api `build`/`dev`/`test` tasks assume Node/tsc; adjust or drop api from Turbo | all |
| `docs/tors` spec step + "four seams" | Spec/tickets reference TS seams (contract schema, oRPC controller spec with stubbed Prisma, React component, Postgres integration); redefine for Java | 4 |
| `lessons/04,07,09,10` | Narrative describes NestJS/oRPC/Prisma/pnpm; rewrite for Java flow | 4–10 |

## Impact on lessons 4-10

- **Lesson 4 (grill -> spec -> tickets):** mostly tooling-agnostic planning;
  will still run. Must update the "seams" wording and the `/to-tickets`
  invocation examples so tickets don't prescribe NestJS/Prisma.
- **Lesson 7+ (`/implement-ticket`, frontier loop, CI, e2e):** will NOT work
  correctly until (a) a real Java backend exists to implement against, and
  (b) the skills/scripts/CI/Dockerfile/lesson text point at
  Maven/JUnit/Flyway/Spring Boot.

Key automation that breaks without changes:
- `scripts/implement-frontier.sh` runs `pnpm --filter @erp/database exec prisma
  migrate reset --force` — fails on a Java/Flyway backend.
- CI runs `pnpm turbo run lint typecheck test build` on Node — needs a Maven job.
- e2e `webServer` runs `pnpm --filter @erp/api start` — needs a Spring Boot start.
- `AGENTS.md` still describes NestJS/oRPC/Prisma, so agents keep generating that
  stack unless rewritten.

## Suggested order

1. Scaffold Spring Boot (JDK 21) backend: Maven, `spring-boot-starter-web`,
   `-security`, `-data-jpa`, `postgresql`, `flyway-core`, `springdoc-openapi`.
2. Implement `/api/health` first; point the Vite proxy / compose at the Java port.
3. JPA `User` entity + `Role` enum + Flyway migration + seed (BCrypt).
4. Implement auth routes (login/logout/me) with Spring Security sessions.
5. Wire springdoc; export committed `openapi.json`; regenerate `packages/contracts`.
6. Swap `apps/web/src/lib/orpc.ts` to the generated client; confirm web + e2e pass.
7. Update CI, Dockerfile, compose, e2e server command, `implement-frontier.sh`.
8. Rewrite `AGENTS.md`, `CLAUDE.md`, the implement/tdd/code-review skills, and
   lessons 4/7/9/10 to describe the Java flow.
9. Only then start lesson 4 against the Java stack.

## Risks / open items

- **Contract direction flip** is the one architectural change that doesn't
  disappear with the greenfield assumption (source of truth moves TS -> Java).
- **Dual toolchain:** Java is an awkward fit for pnpm/Turbo/ESLint/Vitest. Decide
  whether to wrap Maven behind a thin `package.json` for Turbo, or pull the api
  out of the JS toolchain entirely.
- **DB ownership:** confirm Prisma is fully replaced by Flyway (recommended for a
  clean Java stack) rather than kept side by side.
- **Docs/skills drift:** large volume of lesson/skill/AGENTS content assumes
  NestJS; all of it must be rewritten or agents regress to the old stack.
