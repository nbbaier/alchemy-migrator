# alchemy-migrator 2026 Strategic Roadmap

## Executive Summary

This roadmap charts the transformation of `alchemy-migrator` from a single-worker config translator into the **definitive migration platform for Cloudflare infrastructure-as-code**.

Today, the tool successfully converts `wrangler.toml` to `alchemy.run.ts` for straightforward deployments. By end of 2026, it will:

- **Migrate any Cloudflare project** - Workers, Pages, multi-worker architectures
- **Integrate with live infrastructure** - Validate resources, sync secrets, discover config
- **Support bidirectional flow** - Alchemy ↔ Wrangler, reducing lock-in fears
- **Provide visual tooling** - Web UI for non-CLI users
- **Enable ecosystem growth** - Plugin system for community extensions

## High-Level Themes

### Q1: Foundation & Core Value
Building the architectural foundation (IR layer) and expanding to real-world enterprise patterns (multi-worker, API integration). These initiatives make the tool production-ready for complex deployments.

### Q2: Expanded Coverage
Filling gaps in platform coverage (Pages, Assets) and removing manual work (service bindings). The reverse migration path reduces adoption friction by eliminating lock-in concerns.

### Q3: Accessibility & Integration
Opening the tool to non-CLI users (web UI) and machines (SDK). This expands the addressable user base dramatically.

### Q4: Ecosystem
The plugin system enables community-driven growth, positioning the migrator as an extensible platform rather than a static tool.

## Initiative Overview

| # | Initiative | Category | Quarter | Size | Status |
|---|------------|----------|---------|------|--------|
| 00 | [Universal IaC Migration Platform](./00-moonshot.md) | Moonshot | Q4+ | XXL | Vision |
| 01 | [Full IR Layer](./01-full-ir-layer.md) | Architecture | Q1 | XL | Planned |
| 02 | [Multi-Worker & Monorepo](./02-multi-worker-monorepo.md) | New Feature | Q1 | L | Planned |
| 03 | [Cloudflare API Integration](./03-cloudflare-api-integration.md) | New Feature | Q1 | L | Planned |
| 04 | [Complete Binding Coverage](./04-complete-binding-coverage.md) | New Feature | Q1 | M | Planned |
| 05 | [Pages & Assets Migration](./05-pages-assets-migration.md) | New Feature | Q2 | L | Planned |
| 06 | [Service Binding Orchestration](./06-service-binding-orchestration.md) | New Feature | Q2 | M | Planned |
| 07 | [Reverse Migration](./07-reverse-migration.md) | New Feature | Q2 | L | Planned |
| 08 | [Web UI & Visual Tools](./08-web-ui-visual-tools.md) | DX Improvement | Q3 | XL | Planned |
| 09 | [Programmatic API & SDK](./09-programmatic-api-sdk.md) | Integration | Q3 | M | Planned |
| 10 | [Plugin System](./10-plugin-extension-system.md) | Architecture | Q4 | L | Planned |

**Size Legend:** S (days) | M (1-2 weeks) | L (3-4 weeks) | XL (6-8 weeks) | XXL (quarter+)

## Dependency Graph

```
                              ┌──────────────────┐
                              │   00-moonshot    │
                              │  (North Star)    │
                              └────────┬─────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ 08-web-ui       │         │ 10-plugin       │         │ 09-sdk          │
│ (Q3)            │         │ (Q4)            │         │ (Q3)            │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
┌─────────────────┐                                   ┌─────────────────┐
│ 07-reverse      │                                   │ 06-service      │
│ (Q2)            │                                   │ (Q2)            │
└────────┬────────┘                                   └────────┬────────┘
         │                                                     │
         │              ┌─────────────────┐                    │
         │              │ 05-pages        │                    │
         │              │ (Q2)            │                    │
         │              └────────┬────────┘                    │
         │                       │                             │
         └───────────────────────┼─────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ 02-multi-worker │       │ 04-bindings     │
         │ (Q1)            │       │ (Q1)            │
         └────────┬────────┘       └─────────────────┘
                  │
                  │         ┌─────────────────┐
                  │         │ 03-cloudflare   │
                  │         │ (Q1) [parallel] │
                  │         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ 01-ir-layer     │
         │ (Q1) FOUNDATION │
         └─────────────────┘
```

## Current State Assessment

### What Works Well

- **Core migration flow**: Parse → Transform → Generate pipeline is clean
- **Resource coverage**: KV, R2, D1, Queues, DOs, Hyperdrive, AI, Analytics, Browser, Dispatch
- **Test suite**: Comprehensive integration tests with real fixtures
- **Developer experience**: Interactive mode, dry-run, colored output
- **Code quality**: Strict TypeScript, Biome formatting, clear module boundaries

### Key Gaps

1. **Architecture**: IR layer described in PLAN.md not implemented
2. **Scope**: Single-worker only; Pages/Assets unsupported
3. **Integration**: No Cloudflare API connection
4. **Escape hatch**: No reverse migration
5. **Extensibility**: No plugin system
6. **Accessibility**: CLI-only

### Technical Debt

- `any` types in some transformers (see binding-transformer.ts)
- Service bindings only warn, don't migrate
- Vectorize schema exists but no mapper
- Generated code not TypeScript-validated

## Success Metrics

By end of 2026, measure success via:

| Metric | Current | Target |
|--------|---------|--------|
| Supported binding types | 10 | 20+ |
| Workers migrated per run | 1 | Unlimited |
| Migration paths | 1 (wrangler→alchemy) | 3+ |
| User interfaces | CLI | CLI, Web, SDK |
| Community plugins | 0 | 10+ |
| API-validated migrations | 0% | 80%+ |

## Getting Started

Each initiative file contains:
- **Why This Matters**: Strategic value
- **Current State**: What exists today
- **Proposed Future State**: Vision with examples
- **Key Deliverables**: Checkbox task list
- **Prerequisites**: Dependencies on other initiatives
- **Risks & Open Questions**: Known unknowns
- **Notes**: File references, links, implementation hints

Start with [01-full-ir-layer.md](./01-full-ir-layer.md) - it's the foundation everything else builds upon.
