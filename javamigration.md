# Java Migration

บันทึกการย้าย backend ของ ERP Workshop จาก TypeScript/NestJS ไปเป็น Java/Spring Boot
โดยคง frontend (React) และ e2e (Playwright) ไว้เหมือนเดิม

สมมติฐานที่ตกลงกันไว้: เป็น workshop แบบ greenfield (ล้างฐานข้อมูลใหม่ได้) จึงเลือกใช้
Spring Security + BCrypt + session มาตรฐาน และให้ฝั่ง Java เป็นเจ้าของ contract ผ่าน
springdoc (OpenAPI) โดยฝั่ง TypeScript generate client จาก spec นั้น

---

## พาร์ท 1 — เทียบ stack เดิม กับ stack ใหม่

| ชั้น | เดิม (TypeScript) | ใหม่ (Java) |
| --- | --- | --- |
| Framework | NestJS 12 (ESM, Node ≥24) | Spring Boot 3 (JDK 21) |
| Build / task | pnpm + Turborepo + tsc | Maven (ห่อด้วย `package.json` บางๆ ให้ Turbo เรียกได้) |
| Unit test | Vitest (`*.spec.ts`) | JUnit 5 + `@SpringBootTest` / `MockMvc` |
| Routing | oRPC `@Implement(contract.*)` | `@RestController` + `@GetMapping`/`@PostMapping` ใต้ `/api` |
| Validation | Zod (มาจาก contract) | Bean Validation (`@Email`, `@NotBlank`, ...) บน DTO |
| Auth | `AuthGuard` + HMAC cookie เอง | Spring Security + session (`JSESSIONID`) |
| รหัสผ่าน | scrypt (เขียนเอง) | `BCryptPasswordEncoder` |
| ORM | Prisma 7 + driver adapter | Spring Data JPA / Hibernate |
| Migration | Prisma migrate | Flyway (`V<n>__*.sql`, รันตอนบูต) |
| User.id | cuid | UUID |
| OpenAPI | `@orpc/openapi` generator | springdoc |
| Contract (TS) | เขียนเอง: oRPC routes + Zod | **generate** จาก `openapi.json` ด้วย Orval |

### ทิศทางของ contract (จุดเปลี่ยนสำคัญที่สุด)

- **เดิม:** `packages/contracts` (TypeScript) คือ source of truth — ทั้ง api และ web
  import ตรงนี้ และ derive type ด้วย `z.infer`
- **ใหม่:** Java controllers/DTOs คือ source of truth → springdoc ออก
  `packages/contracts/openapi.json` → Orval generate client + TanStack Query hooks
  ให้ฝั่ง web ใช้ ทิศทางกลับด้าน (จาก TS→ทุกฝั่ง เป็น Java→TS)

### ชิ้นส่วนที่ต้องเปลี่ยน (สรุป)

- **แทนที่ทั้งก้อน:** `apps/api` (NestJS) → Spring Boot, และ `packages/database`
  (Prisma) → JPA + Flyway
- **เปลี่ยนรูปแบบ:** `packages/contracts` จากเขียนมือ → generated
- **แก้ให้ชี้ stack ใหม่:** `compose.yaml`, `docker/dev.Dockerfile`, CI
  (`.github/workflows/ci.yml`), `apps/e2e/playwright.config.ts`,
  `scripts/implement-frontier.sh`, `turbo.json`, `scripts/agent-guard.mjs`
- **แก้เอกสาร:** `AGENTS.md`, `README.md`, skills ใน `.agents/skills/`, lessons 1–11
- **แทบไม่แตะ:** `apps/web` (เปลี่ยนแค่ `src/lib/orpc.ts` ให้ชี้ generated client),
  `apps/e2e` (เทสต์เหมือนเดิม เพราะ HTTP contract คงรูปเดิม)

---

## พาร์ท 2 — ไฟล์/โฟลเดอร์ที่เปลี่ยน และเหตุผล

### Backend (Java)

- `apps/api/` — เดิมเป็น NestJS ถูกแทนด้วย Spring Boot ทั้งหมด
  - `pom.xml` — Maven project, JDK 21, deps: web, security, data-jpa, validation,
    postgresql, flyway, springdoc
  - `package.json` — ห่อ Maven ด้วย script (`build`/`test`/`dev`/`lint`) เพื่อให้
    Turbo/pnpm ยัง orchestrate ได้ในชื่อ `@erp/api`
  - `src/main/java/com/erp/api/` — โค้ด: `ApiApplication`, `health/`, `auth/`,
    `user/`, `config/` (Spring Security + OpenAPI)
  - `src/main/resources/application.yaml` — ตั้ง context path `/api`, พอร์ต 3000,
    datasource (`SPRING_DATASOURCE_*`), Flyway
  - `src/main/resources/db/migration/V1__create_users.sql` — schema users (Flyway)
- `packages/database/` — **ลบทิ้ง** (Prisma schema/seed/client ไม่ใช้แล้ว; JPA +
  Flyway ทำหน้าที่แทน)

### Contract

- `packages/contracts/openapi.json` — spec ที่ springdoc ออกให้ (commit ไว้เพื่อให้
  build ของ web/e2e deterministic ไม่ต้องรัน Java server)
- `packages/contracts/orval.config.ts`, `src/fetcher.ts`, `src/index.ts` — ตั้ง
  Orval ให้ generate client/hooks จาก spec; `src/generated/` คือผลลัพธ์ (gitignored)
- `packages/contracts/tsconfig.json` — ใช้ `moduleResolution: bundler` เพราะ
  โค้ดที่ Orval generate import แบบไม่มีนามสกุล และถูก bundle ด้วย tsup
- ไฟล์เดิม `src/auth.ts`, `src/health.ts` (oRPC + Zod) — ลบ

### Frontend (web)

- `apps/web/src/lib/orpc.ts` — เปลี่ยนจาก oRPC client เป็น adapter บางๆ ที่คง
  call site เดิม (`orpc.auth.me.queryOptions()` ฯลฯ) แต่เรียก generated hooks ข้างใต้
- `apps/web/src/lib/auth.ts` — เปลี่ยน `ORPCError` เป็น `ApiError` ตอนเช็ค 401
- `apps/web/package.json` — ถอด dependency `@orpc/*`
- `apps/web/AGENTS.md` — อัปเดตข้อความให้ตรง generated client + proxy ไป Spring Boot

### Infra / automation

- `docker/dev.Dockerfile` — เพิ่ม JDK 21 (จาก temurin) + Maven ในอิมเมจ Node เดิม
  และเพิ่มขั้นตอนลง corporate TLS cert (`docker/certs/*.crt`) เข้า OS store + JDK
  keystore + ตัวแปร npm/Node/git/Maven เพื่อให้ build หลัง proxy (Zscaler) ไม่ติด
- `docker/certs/` — โฟลเดอร์ใส่ root/intermediate CA (มี `.gitkeep`; `*.crt` gitignored)
- `docker/studio-proxy.mjs` — **ลบ** (ใช้คู่กับ Prisma Studio)
- `compose.yaml` — service `api` รัน Spring Boot; เพิ่ม volume `m2`; ตั้ง
  `SPRING_DATASOURCE_*`; ลบ service `studio`; ตัด `DATABASE_URL` ที่ไม่ใช้
- `.github/workflows/ci.yml` — เพิ่ม `setup-java`, `mvn verify`; e2e รัน Java API
  (Flyway + seed ตอนบูต) แทน Prisma migrate/seed
- `apps/e2e/playwright.config.ts` — `webServer` ของ api สตาร์ท Spring Boot
- `scripts/implement-frontier.sh` — reset DB ด้วย `flyway:clean` แทน prisma reset;
  preflight เช็ค `mvn`/`java`
- `turbo.json` — ตัด `db:generate`; e2e depends on `@erp/web#build`; ส่งผ่าน
  `SPRING_DATASOURCE_*`
- `scripts/agent-guard.mjs` — rule reset DB เป็น `flyway:clean`; regex implement-loop
  จับเฉพาะการ "รัน" ไม่จับการพิมพ์ path
- `.env.example` — `SPRING_DATASOURCE_*` แทน `DATABASE_URL`
- รากโปรเจกต์: `package.json` ตัด script `db:*`; `pnpm-workspace.yaml` ตัด Prisma
  ออกจาก `allowBuilds`; `.gitignore` เพิ่ม `target/`, `docker/certs/*.crt`

### เอกสาร / agent config

- `AGENTS.md`, `apps/api/AGENTS.md` (ใหม่), `README.md` — เขียนใหม่สำหรับ stack Java
- `.agents/skills/*` — add-feature, write-tests, repo-commands, implement-ticket,
  write-e2e, review-pr ปรับไปใช้ JPA/Flyway/JUnit/MockMvc/springdoc + `mvn verify`
- `.kiro/agents/implementer.json`, `reviewer.json` — ชี้ไป `apps/api/AGENTS.md`
- `lessons/01`–`11` — แก้เนื้อหา/ตัวอย่างจาก NestJS/oRPC/Prisma/pnpm-db เป็น flow Java

---

## พาร์ท 3 — ลำดับสเตปที่ทำจริง

ทำบน branch `feat/java-backend`, แต่ละสเตป commit เป็น checkpoint หนึ่งครั้ง

**Step 1 — Scaffold Spring Boot + Maven**
สร้าง `apps/api-java` (ตอนนั้นยังขนานกับ NestJS เดิม): `pom.xml`, `ApiApplication`,
`application.yaml` (context path `/api`, พอร์ต 3000), `package.json` ห่อ Maven
พิสูจน์ด้วย `mvn compile` ผ่าน

**Step 2 — Health route + proxy**
`HealthController` (`GET /api/health`) คืน JSON รูปเดิม `{api, database, timestamp}`,
`SecurityConfig` เปิด health/docs เป็น public; proxy ชี้พอร์ต 3000 อยู่แล้ว

**Step 3 — User entity + Flyway + seed (BCrypt)**
`User` entity (UUID), enum `Role`, `UserRepository`, migration `V1__create_users.sql`,
`UserSeeder` (demo users `admin`/`staff` password `password`, BCrypt)
บูตจริงบน DB แยก `erp_java` พิสูจน์ migration + seed + health

**Step 4 — Auth routes + Spring Security session**
`LoginRequest`, `AppUserDetailsService`, `AuthController` (login/logout/me),
`SecurityConfig` แบบ session; ทดสอบครบ: login ถูก/ผิด, me ก่อน/หลัง, logout → 401/cookie

**Step 5 — springdoc + regenerate TS contract**
เพิ่ม `@Tag`/`@Operation`/record DTO ให้ spec สะอาด, `OpenApiConfig`; export
`packages/contracts/openapi.json`; ตั้ง Orval generate client/hooks; ลบ oRPC/Zod เดิม

**Step 6 — สลับ web client + พิสูจน์ e2e**
เขียน adapter ใน `apps/web/src/lib/orpc.ts` ให้คง call site เดิม, เปลี่ยนเป็น
`ApiError`, ถอด `@orpc/*`; แก้ fetcher ให้ resolve URL `/api` กับ origin (แก้บั๊ก
jsdom), mark DTO fields เป็น required; web unit tests 9 ตัว + Playwright 3 ตัว เขียว

**Step 7 — Infra/automation ชี้ stack ใหม่**
Dockerfile เพิ่ม JDK+Maven; compose รัน Spring Boot; CI เพิ่ม `mvn verify`; playwright
webServer เป็น Java; `implement-frontier.sh` ใช้ `flyway:clean`; turbo ปรับ task

**Step 8 — เขียน docs/skills/lessons ใหม่**
`AGENTS.md`/`README.md`/skills/lessons 1–11 เปลี่ยนจาก NestJS/oRPC/Prisma เป็น flow
Java; guard ปรับ rule reset เป็น flyway + regex implement-loop; agent config ชี้ใหม่

**Step 9 — Cut over + ลบ stack เดิม**
ลบ `apps/api` (NestJS) และ `packages/database` (Prisma); rename `apps/api-java` →
`apps/api`, package `@erp/api-java` → `@erp/api`; แก้ทุก path จาก `api-java` เป็น `api`;
ตัด script `db:*`, studio service, Prisma allowBuilds; รีเซ็ต DB `erp` ให้ Flyway เป็น
เจ้าของ; ยืนยัน `pnpm check` + `mvn verify` + prettier + e2e เขียวทั้งหมด

### หลังจบ 9 สเตป (งานเสริมหลัง migration)

- รองรับ build หลัง Zscaler: เพิ่มขั้นตอน CA cert ใน Dockerfile, โฟลเดอร์
  `docker/certs/` (loop import ทุก `*.crt` เข้า OS + JDK), gitignore cert
