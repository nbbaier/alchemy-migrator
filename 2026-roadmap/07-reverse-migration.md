# Reverse Migration & Bidirectional Sync

**Category:** New Feature
**Quarter:** Q2
**T-shirt Size:** L

## Why This Matters

Migration is a trust exercise. Organizations are more willing to adopt Alchemy if they know they can reverse course if needed. Currently:

- One-way migration only (wrangler → Alchemy)
- No escape hatch
- Lock-in concerns may block adoption
- Teams experimenting with Alchemy can't easily compare

A reverse migration path (Alchemy → wrangler) would:
- Reduce adoption friction dramatically
- Enable A/B comparison of deployments
- Allow gradual migration with rollback capability
- Position alchemy-migrator as a neutral "bridge" tool

## Current State

- Unidirectional: wrangler → Alchemy only
- Generated `alchemy.run.ts` cannot be converted back
- No parsing of Alchemy configuration format
- Original `wrangler.toml` preserved but diverges immediately

## Proposed Future State

Bidirectional migration with optional sync:

```bash
# Reverse migration
$ alchemy-migrator reverse alchemy.run.ts --output wrangler.toml

Parsing Alchemy configuration...
  - 3 KV namespaces
  - 2 workers
  - 5 routes

Generating wrangler.toml...
  ✓ Resources converted
  ✓ Bindings mapped
  ⚠️ Custom TypeScript logic cannot be migrated (manual review needed)

Created: wrangler.toml
```

```bash
# Bidirectional sync (advanced)
$ alchemy-migrator sync

Comparing configurations:
  wrangler.toml (last modified: 2025-01-15)
  alchemy.run.ts (last modified: 2025-01-18)

Changes detected in Alchemy config:
  + Added: analytics_engine_datasets.METRICS
  ~ Modified: worker.routes (added /api/v2/*)

Apply changes to wrangler.toml? [y/N]
```

## Key Deliverables

- [ ] Build Alchemy config parser (TypeScript AST analysis)
- [ ] Implement reverse transformers (Alchemy resource → wrangler config)
- [ ] Add `reverse` command to CLI
- [ ] Handle Alchemy-specific features that don't map to wrangler
- [ ] Generate warnings for non-reversible configurations
- [ ] Implement `sync` command for bidirectional updates
- [ ] Add diff visualization between configurations
- [ ] Support partial reverse (single worker from multi-worker config)
- [ ] Create reconciliation logic for merge conflicts

## Prerequisites

- 01-full-ir-layer (IR as common intermediate format)

## Risks & Open Questions

- Alchemy features without wrangler equivalent (state stores, etc.)
- TypeScript dynamic logic in alchemy.run.ts - how to handle?
- Sync conflicts: which source of truth wins?
- Version drift: configs modified in both places
- Performance: AST parsing of potentially large TypeScript files

## Notes

- Could use TypeScript compiler API for parsing alchemy.run.ts
- The IR layer becomes the "universal format" between both
- Consider generating "migration comments" in wrangler.toml for lossy conversions
- Sync feature may be better as watch mode in dev
