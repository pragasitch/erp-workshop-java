# ERP Workshop: Java + TypeScript Monorepo

The starter repository for the on-site **AI-assisted coding workshop**. We will build an ERP together on top of this scaffold:

- **Frontend**: [Vite](https://vite.dev) + React 19, React Router, TanStack Query, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com)
- **Backend**: [Spring Boot](https://spring.io/projects/spring-boot) 3 (JDK 21), built with [Maven](https://maven.apache.org)
- **API contract**: defined by the Spring controllers; [springdoc](https://springdoc.org) emits the OpenAPI spec, and the TypeScript client is generated from it
- **Database**: PostgreSQL 18, [Spring Data JPA](https://spring.io/projects/spring-data-jpa) + [Flyway](https://flywaydb.org) migrations
- **Monorepo**: [Turborepo](https://turborepo.dev) + [pnpm](https://pnpm.io) workspaces for the web and shared packages
- **Dev environment**: Docker Compose. **You only need Docker installed.**

No ERP features yet. This is the clean starting point. Sign-in is already built in, so the workshop can go straight to the ERP.

The lessons that go with the workshop are in [`lessons/`](lessons/README.md). Start with [Lesson 1: Monorepos, Turborepo, and AI coding](lessons/01-monorepo-and-turborepo.md), then [Lesson 2: Context engineering: AGENTS.md and skills](lessons/02-context-engineering-agents-md-and-skills.md) [Lesson 3: Start clean: reset your agent, lock the project settings, switch off memory](lessons/03-clean-agent-setup.md), [Lesson 4: From a TOR to tickets: grill, spec, tickets](lessons/04-from-tor-to-tickets.md), [Lesson 5: Hooks: a guard between the agent and the shell](lessons/05-hooks-guard-the-shell.md), [Lesson 6: Subagents: fresh windows that work for the main one](lessons/06-subagents-fresh-windows.md), [Lesson 7: From tickets to code: one turn of the implement loop](lessons/07-from-tickets-to-code.md), [Lesson 8: An AI reviewer on every pull request: Kiro in GitHub Actions](lessons/08-ai-reviews-the-pull-request.md), [Lesson 9: The loop without the typing: a headless implementer over the frontier](lessons/09-the-loop-without-the-typing.md), [Lesson 10: The Demo line, run by a machine: Playwright on every pull request](lessons/10-the-demo-line-run-by-a-machine.md), and [Lesson 11: One server, on purpose: planning into Jira through MCP](lessons/11-one-server-on-purpose-jira-mcp.md).

---

## 1. Before the workshop (please do this at home)

Venue Wi-Fi is shared by everyone, so download the heavy stuff beforehand.

1. Install:
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux)
   - [Git](https://git-scm.com/)
   - An editor: [VS Code](https://code.visualstudio.com/), Cursor, Kiro, WebStorm, ...
   - [GitHub CLI](https://cli.github.com/) (`gh`), signed in with `gh auth login`. Lesson 4 uses it to fork the repo and publish issues.
2. **Windows only:** install [WSL 2](https://learn.microsoft.com/windows/wsl/install) and clone the repo **inside the WSL filesystem** (e.g. `~/code`, not `C:\...` / `/mnt/c/...`). File watching and performance are much better there.
3. Fork this repository on GitHub, then clone **your fork** and pre-download everything. Lesson 4 publishes GitHub issues into your fork. (Already cloned the original? Lesson 4 shows how to fork afterwards.) While you are on github.com, open your fork's **Actions** tab and press the button that enables workflows: GitHub switches them off on every fork, and lessons 7 to 10 need CI and the AI review running on yours.

   ```bash
   git clone <your-fork-url> erp-workshop
   cd erp-workshop
   docker compose build             # dev image (Node 24 + pnpm, JDK 21 + Maven)
   docker compose pull postgres     # database image
   docker compose run --rm install  # installs node_modules + builds shared packages
   ```

4. Start it once to check everything works (see below), then `docker compose down`.

## 2. Start the stack

```bash
docker compose up
```

The first start takes a few minutes. When the logs settle:

| What                 | URL                                 |
| -------------------- | ----------------------------------- |
| Web app              | http://localhost:5173               |
| API                  | http://localhost:3000/api           |
| API docs (Swagger)   | http://localhost:3000/api/docs      |
| Postgres (for tools) | `localhost:5432` user/pass/db `erp` |

Sign in with one of the demo accounts (they are also listed on the login page):

| Email             | Password   | Role    |
| ----------------- | ---------- | ------- |
| `admin@erp.local` | `password` | `ADMIN` |
| `staff@erp.local` | `password` | `STAFF` |

The home page then shows a **System status** card. **API ✅ / Database ✅** means the full chain works: React → generated client → Vite proxy → Spring Boot → JPA → Postgres.

Edit any file and it reloads automatically: React (HMR), the Spring Boot API (restart), and the shared packages (rebuild).

Stop with `Ctrl+C`, or `docker compose down`. Add `-v` to also delete the database.

### Signing in

Auth is deliberately minimal and only meant for the workshop. There is no sign-up or password reset: users come from the seeder in `apps/api` (`user/UserSeeder.java`), which runs every time the API starts.

- `POST /api/auth/login` checks the password and starts a server-side session (`JSESSIONID` cookie) via Spring Security. `/api/auth/logout` invalidates it, and `/api/auth/me` returns the current user.
- Every API route requires a signed-in user unless it is made public in `SecurityConfig`. `hasRole("ADMIN")` limits a route to certain roles (`apps/api/.../auth`, `.../config/SecurityConfig.java`).
- In the web app, every page under `RequireAuth` redirects to `/login` when nobody is signed in or any request returns 401 (`apps/web/src/lib/auth.ts`).

### Browse the database

```bash
docker compose --profile tools up -d studio   # a database UI on http://localhost:5555
```

## 3. Everyday commands

The web and shared packages use pnpm/Turbo; the API is a Maven project.

```bash
pnpm check                                     # web + packages: lint, typecheck, test, build
mvn -q -B -f apps/api/pom.xml verify      # build and test the Java API
mvn -q -B -f apps/api/pom.xml flyway:clean # wipe the database; the API re-migrates + seeds on next boot
pnpm add <pkg> --filter @erp/web               # add a web/package dependency
```

Add a new Flyway migration by dropping a `V<n>__<change>.sql` under
`apps/api/src/main/resources/db/migration`; it runs on the next API boot.

> Everything also runs inside Docker (`docker compose up`): the `api` service
> builds and runs the Spring Boot app. Don't run `pnpm dev:local` at the same
> time as `docker compose up`, because they use the same ports.

## 4. How the project is organised

```
apps/
  web/          @erp/web        React app (talks only to /api, proxied by Vite)
  api/          @erp/api        Spring Boot app (owns the API contract)
packages/
  contracts/    @erp/contracts  TypeScript client, generated from the OpenAPI spec
  typescript-config/            shared tsconfig
  eslint-config/                shared ESLint config
compose.yaml                    local dev stack
turbo.json                      task pipeline for the web + packages
```

**Java owns the contract.** The Spring controllers and DTOs in `apps/api`
define every endpoint; springdoc emits `packages/contracts/openapi.json`, and
`packages/contracts` generates the TypeScript client and hooks from it:

- `apps/api` defines it: `@GetMapping("/health")` returning a DTO
- `apps/web` calls it with generated TanStack Query hooks: `useCheck()`

Change a controller or DTO, regenerate the spec and the client, and TypeScript
shows what to fix on the web side.

See [AGENTS.md](AGENTS.md) for the repo conventions and `apps/api/AGENTS.md` / `apps/web/AGENTS.md` for the rules specific to each app. The step-by-step "add a feature" workflow, test recipes and command cheat-sheet live as skills in `.agents/skills/`. (Your AI assistant reads all of them too.)

## 5. Troubleshooting

| Problem                                  | Fix                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `port is already allocated`              | Something else uses the port. Copy `.env.example` to `.env` and change `WEB_PORT` / `API_PORT` / `POSTGRES_PORT`.                                               |
| Changes are not picked up                | Windows: make sure the repo is inside WSL, not under `/mnt/c`. Then `docker compose restart api web`.                                                           |
| Editor shows red squiggles everywhere    | `node_modules` is missing: `docker compose run --rm install`, then restart the TS server in your editor.                                                        |
| Weird dependency errors after `git pull` | `docker compose run --rm install`                                                                                                                               |
| Can't sign in with the demo accounts     | Re-create them: restart the API (the seeder runs on boot), or `mvn -q -B -f apps/api/pom.xml flyway:clean` then start again.                                    |
| Seed fails or schema looks wrong         | The database volume is shared by every clone of this repo and may hold another checkout's tables. `pnpm docker:clean` (deletes the database), then start again. |
| Start completely fresh                   | `pnpm docker:clean`, delete `node_modules`, then `docker compose up`                                                                                            |

## Optional: Dev Container

If you use VS Code / Cursor with the Dev Containers extension, choose **"Reopen in Container"**. You get a shell inside the dev image (Node, pnpm, Postgres already wired) and can run `pnpm dev` there.
