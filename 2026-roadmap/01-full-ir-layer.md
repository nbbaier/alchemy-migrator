# Full Intermediate Representation Layer

**Category:** Architecture
**Quarter:** Q1
**T-shirt Size:** XL

## Why This Matters

The current implementation uses a simplified `AlchemyConfig` structure that works for single-worker migrations but lacks the sophisticated resource management described in the architecture plan. The IR layer with `ResourceRegistry` is the foundation that unlocks:

- Multi-worker scenarios with shared resources
- Resource deduplication across environments
- Cross-reference validation before code generation
- Proper handling of circular dependencies between resources

Without this foundation, the tool will hit scaling walls as users attempt more complex migrations. This is the architectural investment that pays dividends across every subsequent initiative.

## Current State

- `PLAN.md` describes a complete IR architecture with `ResourceKey`, `ResourceRegistry`, and `AlchemyIR` types
- `src/types/ir.ts` defines the types but they're not used in the actual transformation pipeline
- Current flow: `WranglerConfig` → `ConfigTransformer` → `AlchemyConfig` (simplified)
- No central registry for tracking resource relationships
- No cross-reference validation

## Proposed Future State

A fully-realized IR layer where:

1. **ResourceRegistry** acts as the single source of truth for all resources
2. Every resource has a stable `ResourceKey` (e.g., `kv:cache`, `d1:main-db`)
3. Bindings reference resources via keys, not string interpolation
4. IR validation catches broken references before code generation
5. Resources can be shared across multiple workers
6. Deterministic output via registry iteration order

```typescript
// Example IR structure
const ir: AlchemyIR = {
  appName: "my-app",
  registry: new ResourceRegistry(),
  workers: [worker1, worker2], // Both can reference shared resources
  warnings: [],
  manualSteps: [],
  meta: { sourceFormat: "toml", ... }
};

// Resource keys enable cross-referencing
ir.registry.set("kv:sessions", sessionKVResource);
ir.registry.set("queue:tasks", taskQueueResource);
// Worker bindings reference by key
worker1.bindings.set("SESSIONS", { type: "resource", key: "kv:sessions" });
worker2.bindings.set("SESSIONS", { type: "resource", key: "kv:sessions" }); // Shared!
```

## Key Deliverables

- [ ] Implement `ResourceRegistry` class with Map-based storage and helper methods
- [ ] Create `IRBuilder` that constructs IR from normalized config
- [ ] Refactor `ConfigTransformer` to produce `AlchemyIR` instead of `AlchemyConfig`
- [ ] Implement `IRValidator` for cross-reference validation
- [ ] Update generators to consume IR structure
- [ ] Add deterministic sorting for reproducible output
- [ ] Migrate existing tests to new architecture
- [ ] Update SCOUT.md and documentation

## Prerequisites

None - this is foundational work.

## Risks & Open Questions

- Breaking change for any consumers of current internal APIs
- Need to maintain backwards-compat for CLI interface
- How to handle IR serialization if we want caching/debugging?
- Should IR support incremental updates for watch mode?

## Notes

- See `PLAN.md` sections 1.2 (Intermediate Representation) and 2 (Parser Implementation)
- The `src/types/ir.ts` file already has type definitions to follow
- Consider using a factory pattern for `ResourceRegistry` to enable testing
