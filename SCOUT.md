# Codebase Scout Report: alchemy-migrator

_Last updated: Wed Nov 19 2025 12:00 PM_

## What This Project Does

`alchemy-migrator` is a CLI tool that converts Cloudflare Wrangler configuration files (`wrangler.toml` or `wrangler.json`) into Alchemy infrastructure-as-code files (`alchemy.run.ts`). It handles the migration of Workers, their bindings (KV, R2, D1, Queues, Durable Objects), routes, and environment variables.

## Current Architecture

The tool follows a clean 3-stage pipeline:

1. **Parse** → Reads and validates wrangler config using Zod schemas
2. **Transform** → Maps Cloudflare resources/bindings to Alchemy equivalents
3. **Generate** → Creates TypeScript files with proper imports and syntax

## Key Components

- **CLI** (`src/cli/`): Three commands - `migrate`, `preview`, `validate`
- **Parsers** (`src/parsers/`): TOML/JSON parsing with comprehensive Zod validation
- **Transformers** (`src/transformers/`): Core mapping logic (ResourceMapper, BindingTransformer)
- **Generators** (`src/generators/`): TypeScript code generation using AST builder
- **Types** (`src/types/`): Well-defined interfaces for all data structures

## What Works Now

✅ **Core Migration**: Converts complex wrangler configs to working `alchemy.run.ts` files
✅ **Resource Mapping**: Handles KV, R2, D1, Queues, Durable Objects, AI, Analytics Engine
✅ **Binding Conversion**: Maps all binding types, auto-detects secrets vs plain text vars
✅ **Type Generation**: Creates `worker-env.d.ts` for type-safe bindings
✅ **Interactive Mode**: Prompts for user input when needed
✅ **Dry Run**: Preview mode without writing files
✅ **Multi-environment**: Supports wrangler environment overrides
✅ **Comprehensive Tests**: Integration tests with real fixtures

## Development Workflow

```bash
# Install deps (Bun only)
bun install

# Build the project
bun run build

# Run tests
bun run test

# Lint/format
bun run check && bun run fix

# Test locally
bun src/cli/index.ts migrate --dry-run
```

## Current Status & Next Steps

**Status**: The core migration functionality is complete and tested. The tool successfully converts real-world wrangler configurations to working Alchemy code.

**Immediate Focus**: The `PLAN.md` describes an advanced "IR" layer with `ResourceRegistry` that's not yet implemented. Current code uses a simpler `AlchemyConfig` structure that works but may not scale for complex multi-worker scenarios.

**To Pick Up**: If extending the tool, consider implementing the full IR architecture described in `PLAN.md` for better resource deduplication and cross-references. The current implementation is production-ready for single-worker migrations.
