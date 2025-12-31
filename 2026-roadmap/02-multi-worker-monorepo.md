# Multi-Worker & Monorepo Support

**Category:** New Feature
**Quarter:** Q1
**T-shirt Size:** L

## Why This Matters

Real-world Cloudflare deployments rarely have just one worker. Organizations typically have:

- API workers, scheduled workers, queue processors
- Frontend workers for different domains
- Microservices architecture with inter-service bindings
- Monorepos with multiple wrangler configs

Currently, alchemy-migrator can only process one wrangler config at a time, producing one `alchemy.run.ts`. This forces users to run the tool multiple times and manually reconcile shared resources. A seamless multi-worker migration flow would dramatically reduce friction for adopting Alchemy in production environments.

## Current State

- Single `wrangler.toml` → single `alchemy.run.ts`
- No awareness of monorepo structures
- No resource deduplication across configs
- Service bindings only emit warnings
- Shared KV/R2/D1 between workers requires manual reconciliation

## Proposed Future State

A unified migration experience for multi-worker projects:

```bash
# Discover and migrate all workers in a monorepo
$ alchemy-migrator migrate --discover ./apps

Discovered 5 workers:
  - apps/api/wrangler.toml
  - apps/worker/wrangler.toml
  - apps/cron/wrangler.toml
  - apps/queue-processor/wrangler.toml
  - packages/shared-worker/wrangler.toml

Detected shared resources:
  - KV: CACHE (used by api, worker)
  - D1: MAIN_DB (used by api, cron)
  - Queue: TASKS (produced by api, consumed by queue-processor)

Generating alchemy.run.ts with 5 workers and 3 shared resources...
```

**Output structure:**
```
alchemy/
  alchemy.run.ts        # Unified config with all workers
  workers/
    api-env.d.ts
    cron-env.d.ts
    ...
  .env.example
  MIGRATION.md
```

## Key Deliverables

- [ ] Add `--discover` flag to recursively find wrangler configs
- [ ] Implement multi-config parsing and merging
- [ ] Build resource deduplication logic (same KV ID = same resource)
- [ ] Detect service bindings between discovered workers
- [ ] Generate unified `alchemy.run.ts` with proper resource ordering
- [ ] Generate per-worker type definitions
- [ ] Add interactive mode for ambiguous cases (same binding name, different resources)
- [ ] Support `pnpm-workspace.yaml`, `turbo.json`, `lerna.json` detection
- [ ] Add `--filter` flag for partial migration

## Prerequisites

- 01-full-ir-layer (ResourceRegistry enables proper deduplication)

## Risks & Open Questions

- Naming conflicts: two workers with `CACHE` binding pointing to different KVs
- Ordering: some workers may depend on resources created by others
- Generated output size: single file vs. modular structure?
- How to handle workers that shouldn't be migrated together?
- Cross-account resources?

## Notes

- Should detect workspace-level vs. per-package wrangler configs
- Consider generating a dependency graph visualization
- Service bindings become first-class references, not warnings
- See `src/utils/file-utils.ts:detectProjectContext()` for existing detection logic
