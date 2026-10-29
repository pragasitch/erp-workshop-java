# Steps: Migrate backend to Java (Spring Boot + Maven + JUnit)

Working branch: `feat/java-backend`.

**Checkpoint rule:** every step ends with exactly **one commit** so each step is a
restorable checkpoint. Commit only the files that belong to that step. Do not
stage `.kiro/settings/cli.json` (session setting, unrelated).

See `changes.md` for the full impact analysis and agreed decisions.

## Guiding principle

Add the Java backend **in parallel first** (reversible), prove it works, then cut
over. Do not delete the old NestJS/Prisma code until the Java stack is green.

## Decisions to lock before Step 1

1. Place Java at `apps/api` directly, or parallel as `apps/api-java` (recommended: parallel).
2. Drop Prisma entirely for Flyway, or keep Prisma only for migrations (recommended: Flyway).
3. TS client generator: Orval (keeps TanStack Query hooks) vs openapi-typescript (recommended: Orval).
4. Keep Java inside Turbo (thin `package.json` wrapping Maven) or pull it out (decide).

---

## Step 1 - Scaffold Spring Boot + Maven

Create a bootable empty Java backend.

- `pom.xml` (JDK 21) with: `spring-boot-starter-web`, `-security`, `-data-jpa`,
  `postgresql`, `flyway-core`, `springdoc-openapi-starter-webmvc-ui`.
- Main application class + `application.yaml` (datasource ->
  `postgresql://erp:erp@localhost:5432/erp`, same as compose).
- All routes under `/api` (matches the old `setGlobalPrefix('api')`).

Pass: `mvn compile` succeeds, app boots.

**Commit:** `Step 1: scaffold Spring Boot + Maven backend`

## Step 2 - Health route + point proxy to Java

First end-to-end web -> backend path.

- `HealthController` (`GET /api/health`) returns the old JSON shape
  `{ api: "ok", database: "ok"|"error", timestamp }`, query `SELECT 1`.
- Point `API_PROXY_TARGET` (vite.config.ts / compose) at the Java port.

Pass: web health status renders; `curl /api/health` returns the old JSON.

**Commit:** `Step 2: implement /api/health and point proxy at Java`

## Step 3 - JPA User entity + Flyway migration + seed (BCrypt)

New data layer.

- Entity `User` (id UUID, email unique, name, passwordHash, role, timestamps) +
  enum `Role {ADMIN, STAFF}`, matching the old schema.prisma.
- Flyway `V1__create_users.sql` creates table + enum.
- Seed demo users with `BCryptPasswordEncoder` (CommandLineRunner or seed migration).

Pass: migration runs, table created, demo users inserted with BCrypt hashes.

**Commit:** `Step 3: add User entity, Flyway migration, and BCrypt seed`

## Step 4 - Auth routes + Spring Security

Port auth.

- Spring Security session-based (`JSESSIONID`), CSRF/policy configured.
- Mapping: `@Public()` -> `permitAll()`, `@Roles('ADMIN')` -> `hasRole("ADMIN")`,
  `@CurrentUser` -> `@AuthenticationPrincipal`.
- Routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`,
  same request/response shapes (login takes `{email, password}`, returns user
  without passwordHash).

Pass: login returns a session cookie, `/auth/me` returns the user, logout clears
the session, wrong password = 401.

**Commit:** `Step 4: add auth routes and Spring Security session handling`

## Step 5 - springdoc + regenerate TS contract

Move the contract source of truth to Java.

- Enable springdoc: serve `/api/openapi.json` + `/api/docs` (replaces the old
  OpenApiController).
- Export the spec to a committed `openapi.json` (springdoc-openapi-maven-plugin
  or a script) so web/e2e builds are deterministic without a running server.
- `packages/contracts` build: generate from `openapi.json` (Orval recommended) instead
  of hand-written oRPC.

Pass: `openapi.json` matches the real routes; `packages/contracts` builds with full types.

**Commit:** `Step 5: generate OpenAPI spec and regenerate TS contract`

## Step 6 - Swap web client + prove with e2e

Connect web to the generated contract.

- Edit `apps/web/src/lib/orpc.ts`: swap `createORPCClient` for the generated
  client; component call sites unchanged (`queryOptions`/`mutationOptions`).
- Run web unit tests (Vitest) + e2e (Playwright `smoke.e2e.ts`, `auth.setup.ts`).

Pass: web renders, login flow works, e2e green.

**Commit:** `Step 6: swap web to generated client and verify e2e`

## Step 7 - Update infra/automation to the new stack

Old files assume NestJS/Prisma/pnpm.

- `docker/dev.Dockerfile`: add a JDK 21 stage for the api service.
- `compose.yaml`: change the `api` service command to start Spring Boot.
- `.github/workflows/ci.yml`: add a Maven job (`mvn verify`) instead of/alongside turbo.
- `apps/e2e/playwright.config.ts`: `webServer` for api -> Java start command.
- `scripts/implement-frontier.sh`: replace `prisma migrate reset` with Flyway/Maven
  reset; fix preflight (currently checks `pnpm`).
- `turbo.json`: adjust or drop the api build/dev/test tasks (they assume tsc/Node).

Pass: `docker compose up` comes up; CI green; e2e green under CI conditions.

**Commit:** `Step 7: update Docker, compose, CI, e2e, and scripts for Java`

## Step 8 - Rewrite docs/skills for the new stack

Critical, or agents keep generating NestJS.

- `AGENTS.md` (root + `apps/api`), `CLAUDE.md`: rewrite for Spring Boot/JPA/springdoc/Maven.
- Skills `implement`, `tdd`, `code-review`, `implement-ticket`: change test cadence from
  `tsc`+Vitest to `mvn compile`+JUnit; redefine the "seams".
- Lessons 4, 7, 9, 10: update narrative + `/to-tickets` examples that reference TS seams.

Pass: AGENTS.md backend section has no leftover NestJS/oRPC/Prisma references.

**Commit:** `Step 8: rewrite AGENTS.md, skills, and lessons for the Java stack`

## Step 9 - Cut over and prepare for lesson 4

- If parallel (`apps/api-java`): delete old `apps/api`, move Java into `apps/api`,
  delete `packages/database` (Prisma) if Flyway is the full replacement.
- Verify the new check command + e2e all green, no leftover old-stack references.

Pass: full check + e2e green; ready to start lesson 4 on the Java stack.

**Commit:** `Step 9: cut over to Java backend and remove old stack`

---

## Checkpoint summary

| Step | Checkpoint commit                                         |
| ---- | --------------------------------------------------------- |
| 1    | scaffold Spring Boot + Maven backend                      |
| 2    | implement /api/health and point proxy at Java             |
| 3    | add User entity, Flyway migration, and BCrypt seed        |
| 4    | add auth routes and Spring Security session handling      |
| 5    | generate OpenAPI spec and regenerate TS contract          |
| 6    | swap web to generated client and verify e2e               |
| 7    | update Docker, compose, CI, e2e, and scripts for Java     |
| 8    | rewrite AGENTS.md, skills, and lessons for the Java stack |
| 9    | cut over to Java backend and remove old stack             |
