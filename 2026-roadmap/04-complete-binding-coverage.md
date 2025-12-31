# Complete Binding & Resource Coverage

**Category:** New Feature
**Quarter:** Q1
**T-shirt Size:** M

## Why This Matters

Cloudflare's platform evolves rapidly. New binding types are added regularly, and the migrator must keep pace. Currently, several binding types are either partially supported or entirely missing:

- **Vectorize**: Schema defined but no mapper implementation
- **mTLS certificates**: Not handled
- **Workflows**: Cloudflare's new orchestration primitive
- **Email routing**: Worker-based email handlers
- **Constellation**: AI model deployment
- **Pipelines**: Data ingestion pipelines
- **Rate Limiting**: Not handled

Every unsupported binding forces users into manual migration work, reducing the tool's value proposition. Comprehensive binding support is table stakes for production adoption.

## Current State

**Fully supported:**
- KV Namespaces, R2 Buckets, D1 Databases
- Queues (producers and consumers)
- Durable Objects
- Hyperdrive, AI, Browser Rendering
- Analytics Engine Datasets
- Dispatch Namespaces

**Partially supported:**
- Vectorize: Schema in `parsers/schema.ts:166` but no `ResourceMapper.mapVectorize()`
- Service bindings: Only emits warning, no migration

**Not supported:**
- mTLS bindings
- Workflows bindings
- Email workers
- Constellation
- Pipelines
- Rate limiting
- Text/Data/WASM blobs (schema exists, no migration)

## Proposed Future State

100% coverage of Cloudflare's binding types:

```typescript
// resource-mapper.ts additions
mapVectorize(vectorize?: WranglerConfig["vectorize"]): AlchemyResource[]
mapMTLS(mtls?: WranglerConfig["mtls_certificates"]): AlchemyResource[]
mapWorkflows(workflows?: WranglerConfig["workflows"]): AlchemyResource[]
mapEmailRouting(email?: WranglerConfig["email"]): AlchemyResource[]
mapPipelines(pipelines?: WranglerConfig["pipelines"]): AlchemyResource[]
mapConstellation(constellation?: WranglerConfig["constellation"]): AlchemyResource[]

// binding-transformer.ts additions
// Text blobs → Alchemy text bindings
// Data blobs → Alchemy data bindings
// WASM modules → Alchemy WASM bindings
```

**Automatic updates via Cloudflare schema tracking:**
- Monitor wrangler schema changes
- Generate stub mappers for new binding types
- Flag unknown bindings for user attention

## Key Deliverables

- [ ] Implement `ResourceMapper.mapVectorize()` for Vectorize indexes
- [ ] Add mTLS certificate binding support
- [ ] Add Workflows binding support when Alchemy supports it
- [ ] Implement text/data/wasm blob migration
- [ ] Add Email routing worker support
- [ ] Track Cloudflare wrangler schema for new binding types
- [ ] Add `--strict` mode that fails on unknown bindings
- [ ] Create comprehensive test fixtures for each binding type
- [ ] Update schema validation to match latest wrangler version

## Prerequisites

None - incremental work on existing architecture.

## Risks & Open Questions

- Alchemy may not support all binding types yet - coordinate with Alchemy team
- Some bindings may require different migration strategies (e.g., mTLS certs)
- Wrangler schema changes between versions - pin to specific version?
- How to handle deprecated bindings?

## Notes

- Vectorize schema at `src/parsers/schema.ts:166-173`
- Check Alchemy's `cloudflare` module for supported resource types
- Consider generating a "binding support matrix" in docs
- Cloudflare's wrangler schema: https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/schemas/config-schema.json
