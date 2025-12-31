# Service Binding Orchestration

**Category:** New Feature
**Quarter:** Q2
**T-shirt Size:** M

## Why This Matters

Service bindings are the nervous system of microservices architectures on Cloudflare. They enable:
- Internal RPC between workers without network overhead
- Environment isolation (dev worker calls dev dependencies)
- Composition of smaller, focused workers

Currently, service bindings only produce a warning:
```
⚠️ Service bindings require manual configuration in Alchemy
```

This breaks the "zero manual work" promise of migration and forces users to understand both wrangler and Alchemy service binding semantics.

## Current State

- `services` array parsed but not transformed
- Warning emitted in `validators/config-validator.ts:41`
- No code generated for service bindings
- No handling of `environment` field in service bindings
- Cross-worker references completely manual

## Proposed Future State

Full service binding migration with dependency graph awareness:

```bash
$ alchemy-migrator migrate --discover ./apps

Analyzing service dependencies...

Service binding graph:
  api-worker
    └─ calls → auth-worker (production)
    └─ calls → billing-worker (production)

  auth-worker
    └─ calls → user-db-worker (production)

All referenced workers found in migration scope.
Generating alchemy.run.ts with proper ordering...
```

**Generated code:**
```typescript
// Workers defined in dependency order
export const userDbWorker = await Worker("user-db", {
  entrypoint: "./apps/user-db/src/index.ts",
  // ...
});

export const authWorker = await Worker("auth", {
  entrypoint: "./apps/auth/src/index.ts",
  bindings: {
    USER_DB: userDbWorker, // Service binding - just reference the worker!
  },
});

export const apiWorker = await Worker("api", {
  entrypoint: "./apps/api/src/index.ts",
  bindings: {
    AUTH: authWorker,
    BILLING: billingWorker,
  },
});
```

## Key Deliverables

- [ ] Parse `services` array and transform to Alchemy service bindings
- [ ] Build service dependency graph during multi-worker migration
- [ ] Topologically sort workers in generated code
- [ ] Handle `environment` field for environment-specific bindings
- [ ] Detect circular dependencies and warn
- [ ] Support cross-migration service bindings (external workers)
- [ ] Add `--skip-external-services` flag for partial migrations
- [ ] Generate type-safe service binding interfaces
- [ ] Handle entrypoints for RPC-style service bindings

## Prerequisites

- 02-multi-worker-monorepo (service bindings are inherently multi-worker)

## Risks & Open Questions

- External services: workers not in migration scope
- Environment mapping: wrangler env vs. Alchemy stage
- Circular dependencies: valid in wrangler, need ordering in Alchemy?
- Type generation: should we generate RPC types from worker exports?
- Service binding versioning?

## Notes

- Service bindings schema: `src/parsers/schema.ts:145-154`
- Current warning: `src/validators/config-validator.ts:41-43`
- Alchemy Worker has built-in service binding support via bindings prop
- See Cloudflare docs: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
