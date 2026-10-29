---
name: repo-commands
description: Running scripts in this monorepo - Docker vs host, Flyway migrations/seed/reset, Maven for the Java API, running one package with --filter, adding dependencies, and node_modules gotchas. Use before running db, install, Maven, or turbo commands.
---

# Repo commands

The web and shared packages use scripts in the root `package.json` (run from the
repo root). The Java API is a Maven project in `apps/api-java`.

## Docker or host?

The stack usually runs in Docker (`pnpm docker:up` / `docker compose up`, services
`postgres`, `api`, `web`). The `api` service builds and runs the Spring Boot app;
Flyway migrates and the seeder creates the demo users on startup.

If JDK 21 + Maven and Node 24 + pnpm are installed on the host, you can run
everything directly. `pnpm dev:local` runs only Postgres in Docker and the apps on
the host; don't run it alongside `docker compose up` (same ports).

Check what is running first: `docker compose ps`.

## Common commands

| Task                                      | Command                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Check the web + packages (lint, typecheck, test, build) | `pnpm check`                                       |
| Build and test the Java API               | `mvn -q -B -f apps/api-java/pom.xml verify`                      |
| Run the Java API                          | `mvn -q -B -f apps/api-java/pom.xml spring-boot:run`            |
| Format                                    | `pnpm format`                                                    |
| One task in one TS package                | `pnpm turbo run test --filter=@erp/web`                          |
| New migration                             | add `V<n>__<change>.sql` under `apps/api-java/src/main/resources/db/migration` (applied on next boot) |
| Regenerate the TS contract after a DTO change | save the spec, then `pnpm --filter @erp/contracts generate` (see `add-feature`) |
| Wipe the database (drop all tables)       | `mvn -q -B -f apps/api-java/pom.xml flyway:clean` (re-migrates + seeds on next boot) |
| Delete containers + all volumes (db, stores) | `pnpm docker:clean`                                           |
| Add a web/package dependency              | `pnpm add <pkg> --filter @erp/web` (run in **one** place only)   |
| Add a Java dependency                     | edit `apps/api-java/pom.xml`                                      |
| Browser tests (the `Demo:` lines)         | `pnpm e2e` on the **host**; see the `write-e2e` skill            |
| Last Playwright report or a trace         | `pnpm --filter @erp/e2e exec playwright show-report`, `... show-trace <zip>` |

## Gotchas

- `node_modules` is a bind mount shared by host and containers. Install in one
  place only; never run `pnpm install` on both sides.
- The Java API connects to Postgres with `SPRING_DATASOURCE_URL` (JDBC form, e.g.
  `jdbc:postgresql://localhost:5432/erp`), not the Prisma-style `DATABASE_URL`.
  `flyway:clean` reads the same `SPRING_DATASOURCE_*` env.
- Flyway runs migrations on every API startup; there is no separate migrate step.
  `ddl-auto` is `validate`, so a schema change is always a new `V<n>__*.sql`.
- Shared packages (`@erp/contracts`) are consumed from `dist/`. `turbo dev`
  rebuilds them in watch mode. If an app sees stale types outside `dev`, run
  `pnpm turbo run build --filter='./packages/*'`. `@erp/contracts` regenerates
  its client from `openapi.json` as part of its build.
- Maven's local repo is a named volume (`m2`) in Docker; on the host it is the
  usual `~/.m2`. First build downloads dependencies.
- Env vars: defaults work without a `.env`. A new host port or credential also
  goes into `.env.example`.
- URLs: web `http://localhost:5173`, API `http://localhost:3000/api`, Swagger docs
  `/api/docs`, OpenAPI JSON `/api/openapi`.
- Playwright runs on the host, never in a container: the dev image has no browser.
  Once per machine: `pnpm --filter @erp/e2e exec playwright install chromium` (the
  download only; `--with-deps` is a human's command). With `docker compose up`
  running, `pnpm e2e` reuses the `api` and `web` containers; with only Postgres up,
  it builds and starts the API and `vite preview` itself.
