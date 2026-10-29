# AGENTS.md

Rules for AI coding agents working in this repository. Humans: see [README.md](README.md).

## What this is

A teaching monorepo for a full-stack ERP. The web app, shared packages and e2e
tests are a Turborepo + pnpm workspace; the backend is a standalone Spring Boot
app built with Maven. Everything runs in Docker.

| Path                 | Package          | What                                                                   |
| -------------------- | ---------------- | ---------------------------------------------------------------------- |
| `apps/web`           | `@erp/web`       | Vite + React 19, React Router, TanStack Query, Tailwind v4, shadcn     |
| `apps/api-java`      | `@erp/api-java`  | Spring Boot 3 (JDK 21), REST API, Spring Security, JPA, Flyway         |
| `packages/contracts` | `@erp/contracts` | TypeScript client + hooks, generated from the API's OpenAPI spec       |
| `apps/e2e`           | `@erp/e2e`       | Playwright browser tests, one per ticket `Demo:` line, run on every PR |

`packages/typescript-config` and `packages/eslint-config` hold shared configs.

Each app has its own rules: [`apps/api-java/AGENTS.md`](apps/api-java/AGENTS.md), [`apps/web/AGENTS.md`](apps/web/AGENTS.md). Read the file for every app you touch.

## Rules

- **Contract-first, Java owns the contract.** The API shape is defined by the
  Spring Boot controllers and DTOs in `apps/api-java`. springdoc generates the
  OpenAPI spec (`packages/contracts/openapi.json`), and `packages/contracts`
  generates the TypeScript client and TanStack Query hooks from it. The web app
  never hand-writes request/response types or `fetch` calls: it imports the
  generated hooks. After changing a route or DTO, regenerate the spec and the
  client (see `apps/api-java/AGENTS.md`).
- **Backend is Java, not Node.** `apps/api-java` is a Maven project; it is not a
  pnpm/ESM package even though a thin `package.json` lets Turbo call its Maven
  scripts. Relative imports in `packages/*` need the `.js` extension. `apps/web`
  uses the `@/` alias for `src/` with no extension.
- **Env vars.** The API reads `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`,
  `SPRING_DATASOURCE_PASSWORD` and `PORT` (see `apps/api-java/src/main/resources/application.yaml`).
  New host ports or credentials also go into `.env.example`.
- **The TS packages** are built to `dist/`; apps import the built output. The
  Java API builds to `apps/api-java/target/`.
- **Before finishing:** from the repo root, `pnpm check` (lint, typecheck, test,
  build) and `pnpm format` for the web and shared packages, and
  `mvn -q -B -f apps/api-java/pom.xml verify` for the API. `pnpm e2e` as well
  when the change touches a `Demo:` line, a page, or `apps/e2e`.

## Skills

Load the matching skill instead of guessing the details:

- `add-feature`: end-to-end recipe with templates (JPA entity + Flyway migration → controller + DTO → regenerate contract → React → tests).
- `write-tests`: how API tests (JUnit + MockMvc), web component tests, and the contract check are written and run.
- `write-e2e`: how the Playwright tests in `apps/e2e` are written and run, one per `Demo:` line, and what to do when the `e2e` check is red.
- `repo-commands`: Docker vs host, Flyway migrations/seed/reset, `--filter`, Maven, and `node_modules` gotchas.
