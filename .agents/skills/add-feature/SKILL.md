---
name: add-feature
description: Step-by-step recipe and file templates for adding a feature end to end (JPA entity + Flyway migration, Spring controller + DTO, regenerate the contract, React page, tests). Use when adding or changing a model, API route, or screen.
---

# Add a feature (contract-first, Java owns the contract)

Work in this order. The Java API defines the shape; the web app consumes a
generated client.

## 1. Data model (`apps/api-java`)

Add a JPA entity and a Flyway migration.

- Entity under `src/main/java/com/erp/api/<feature>/<Feature>.java`
  (`@Entity`, `@Table(name = "<plural>")`, `@Id`). Generate the id in
  `@PrePersist` (`UUID.randomUUID().toString()`), like `user/User.java`.
- Repository: an interface extending `JpaRepository<<Feature>, String>`.
- Migration: `src/main/resources/db/migration/V<n>__<describe_the_change>.sql`.
  `ddl-auto` is `validate`, so the migration and the entity must match exactly.
  Flyway runs on startup; a `CommandLineRunner` seeder (see `user/UserSeeder.java`)
  creates demo rows and is re-runnable.

## 2. Contract: controller + DTOs (`apps/api-java`)

The API shape IS the Java code. Create DTOs as records and a controller:

```java
// customer/CustomerDto.java
public record CustomerDto(
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name) {}

// customer/CreateCustomerRequest.java
public record CreateCustomerRequest(@NotBlank String name) {}
```

```java
// customer/CustomerController.java
@Tag(name = "customers")
@RestController
public class CustomerController {
  private final CustomerRepository customers;
  public CustomerController(CustomerRepository customers) { this.customers = customers; }

  @Operation(operationId = "listCustomers", summary = "List customers")
  @GetMapping("/customers")
  public List<CustomerDto> list() { ... }

  @Operation(operationId = "createCustomer", summary = "Create a customer")
  @PostMapping("/customers")
  public CustomerDto create(@Valid @RequestBody CreateCustomerRequest body) { ... }
}
```

- Controller paths are relative to the `/api` context path; don't repeat it.
- Mark every non-null DTO field `@Schema(requiredMode = REQUIRED)` so the
  generated TypeScript type is not optional.
- All input validation (lengths, formats) goes on the DTO with Bean Validation,
  not in the web app.
- Auth: every route already requires a signed-in user. Make a route public in
  `SecurityConfig` with `permitAll()`, restrict with `hasRole("ADMIN")`, read the
  user with `@AuthenticationPrincipal AppUserDetails principal`.
- Reference: `health/HealthController.java`, `auth/AuthController.java`.

## 3. Regenerate the contract (`packages/contracts`)

The TypeScript client is generated from the API's OpenAPI spec.

```bash
# start the API, then:
curl -s http://localhost:3000/api/openapi > packages/contracts/openapi.json
pnpm --filter @erp/contracts generate      # Orval: types + TanStack Query hooks
```

The hooks are named from the operationId: `listCustomers` -> `useListCustomers`,
`createCustomer` -> `useCreateCustomer`.

## 4. Web (`apps/web`)

- Read: `useListCustomers()` from `@erp/contracts`; the body is `response.data`.
- Write: `useCreateCustomer()`; invalidate the list query on success.
- Page component in `src/routes/<feature>.tsx`, registered in `src/router.tsx`
  as a child of `RootLayout` (inside `RequireAuth`, so the page is protected).
  Reusable pieces in `src/components/`.
- The signed-in user: `const user = useCurrentUser()` from `@/lib/auth`. Hide UI
  by role with `user?.role === 'ADMIN'`; the API still enforces the rule.
- Need a shadcn/ui primitive not in `src/components/ui` yet? From `apps/web`:
  `pnpm dlx shadcn@latest add <component>`.
- Reference: `src/components/health-status.tsx`.

## 5. Tests and checks

Write the API JUnit tests and the web `*.test.tsx` (see the `write-tests` skill), then:

```bash
pnpm check                                    # web + packages: lint, typecheck, test, build
mvn -q -B -f apps/api-java/pom.xml verify     # the Java API
```
