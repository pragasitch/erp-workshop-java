---
name: write-tests
description: How tests are written and run in this repo - Spring Boot API tests with JUnit 5 and MockMvc, React component tests with a QueryClient and a stubbed fetch, and the generated-contract check. Use when adding or fixing tests.
---

# Write tests

The API is tested with JUnit 5; the web and shared packages with Vitest. Tests
are colocated with the code they cover (Java under `src/test/java`).

| Package              | Framework      | Run only this                               |
| -------------------- | -------------- | ------------------------------------------- |
| `apps/api-java`      | JUnit 5 + MockMvc | `mvn -q -B -f apps/api-java/pom.xml test` |
| `apps/web`           | Vitest `*.test.tsx` | `pnpm turbo run test --filter=@erp/web` |
| `packages/contracts` | Vitest `*.test.ts`  | `pnpm turbo run test --filter=@erp/contracts` |

Browser tests are not here: they live in `apps/e2e` with their own skill,
`write-e2e`.

## API test (JUnit + MockMvc)

Use `@SpringBootTest` + `@AutoConfigureMockMvc`, mock the repository with
`@MockBean`, and drive the controller through `MockMvc`. `@WithMockUser` supplies
an authenticated principal so the security filter lets the request through.

```java
@SpringBootTest
@AutoConfigureMockMvc
class CustomerControllerTest {

  @Autowired MockMvc mvc;
  @MockBean CustomerRepository customers;

  @Test
  @WithMockUser
  void listsCustomers() throws Exception {
    when(customers.findAll()).thenReturn(List.of(new Customer("1", "ACME")));

    mvc.perform(get("/api/customers"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("ACME"));
  }

  @Test
  @WithMockUser
  void rejectsBlankName() throws Exception {
    mvc.perform(post("/api/customers")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\"}"))
        .andExpect(status().isBadRequest());
  }
}
```

- Paths include the `/api` context path (`get("/api/customers")`).
- Mock only the repository methods the handler uses; don't hit a real database.
- Role rules: `@WithMockUser(roles = "ADMIN")` for an admin route; a `@WithMockUser`
  with the wrong role should get 403. An unauthenticated request should get 401.
- For a DB-backed test (migrations and real SQL), use `@Testcontainers` with a
  Postgres container instead of mocking the repository.

## Web component test

Render inside a `QueryClientProvider` built with `createQueryClient()` from
`@/lib/query-client`, and stub `fetch` for the API responses. The generated
client looks up `globalThis.fetch` on every call, so `vi.stubGlobal` works.
Reference: `apps/web/src/components/health-status.test.tsx`.

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { CustomerList } from './customer-list';

function renderWithQueryClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}

function mockApi(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(body)));
}

describe('CustomerList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders customers from the API', async () => {
    mockApi([{ id: '1', name: 'ACME' }]);

    renderWithQueryClient(<CustomerList />);

    expect(await screen.findByText('ACME')).toBeInTheDocument();
  });
});
```

- Use `findBy*` (async) for anything that appears after the query resolves.
- jsdom and `@testing-library/jest-dom` matchers are set up in `apps/web/src/test/setup.ts`.
- For several endpoints use `mockApi` from `@/test/mock-api`:
  `mockApi({ 'GET /customers': [...], 'POST /customers': unauthorized() })`. Keys
  are `'<METHOD> <path without /api>'`; unmocked routes answer 404.
- Components that read the user (`useCurrentUser`) need `'GET /auth/me': { user }`
  in the mock. For pages with links or redirects, render through
  `createMemoryRouter` + `RouterProvider`. References:
  `apps/web/src/routes/login.test.tsx`, `apps/web/src/components/require-auth.test.tsx`.

## Contract check

The contract is generated, not hand-written, so the "test" is that the generated
client still builds against the committed spec:

```bash
pnpm --filter @erp/contracts build     # runs generate, then type-checks and bundles
```

If a DTO changed, regenerate the spec first (see the `add-feature` skill), or the
generated client and the API drift apart.
