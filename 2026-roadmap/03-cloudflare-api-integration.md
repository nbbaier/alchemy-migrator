# Cloudflare API Integration

**Category:** New Feature
**Quarter:** Q1
**T-shirt Size:** L

## Why This Matters

The current migrator operates purely on configuration files, making assumptions about what resources exist. This leads to:

- Secrets are detected by name heuristics, not actual Cloudflare secrets
- Resource IDs in config may be stale or incorrect
- No validation that referenced resources actually exist
- Users must manually sync secrets after migration

Direct Cloudflare API integration would enable **validation against live infrastructure**, **secrets migration**, and **resource discovery** - transforming a "config translator" into a true migration assistant.

## Current State

- Migration is purely file-based
- Secret detection uses regex patterns (`/api[_-]?key/i`, etc.) - see `binding-transformer.ts:206`
- No validation that KV IDs, D1 IDs, etc. exist
- Generated `.env.example` has placeholder values
- Users must manually run `wrangler secret put` equivalents

## Proposed Future State

```bash
$ alchemy-migrator migrate wrangler.toml --sync-secrets

Connecting to Cloudflare API...
  Account: ACME Corp (abc123)

Validating resources...
  ✓ KV namespace 'CACHE' exists (kv-123)
  ✓ D1 database 'production-db' exists (db-789)
  ✓ R2 bucket 'my-uploads-bucket' exists
  ✗ Queue 'background-tasks' not found - will be created

Discovering secrets...
  Found 3 secrets: API_KEY, AUTH_TOKEN, DATABASE_URL

Migrating secrets to Alchemy...
  ✓ API_KEY synced
  ✓ AUTH_TOKEN synced
  ✓ DATABASE_URL synced

Generated alchemy.run.ts with validated resources.
```

**API-powered features:**
- Pre-migration validation
- Secret discovery and sync
- Resource adoption verification
- Account/zone context detection
- Live resource ID correction

## Key Deliverables

- [ ] Add Cloudflare API client (using existing `cloudflare` npm package or native fetch)
- [ ] Implement resource validation (KV, R2, D1, Queues exist and are accessible)
- [ ] Build secrets discovery from Cloudflare Workers Secrets API
- [ ] Add `--sync-secrets` flag to migrate secrets to Alchemy state
- [ ] Implement `--validate-only` mode for pre-flight checks
- [ ] Add account/zone auto-detection from API token permissions
- [ ] Correct stale resource IDs by matching names
- [ ] Add `alchemy-migrator discover-resources` command to list all account resources
- [ ] Support `CLOUDFLARE_API_TOKEN` environment variable

## Prerequisites

None - can be developed in parallel with other initiatives.

## Risks & Open Questions

- API token permissions: what scopes are required?
- Rate limiting: how to handle accounts with 1000+ resources?
- Secrets encryption: how to handle ALCHEMY_PASSWORD flow?
- Should we write secrets directly to `.alchemy/state.json` or use Alchemy CLI?
- Offline mode: tool should still work without API access
- Multi-account scenarios?

## Notes

- See Cloudflare API docs: https://developers.cloudflare.com/api
- Workers Secrets API: `GET /accounts/{account_id}/workers/scripts/{script_name}/secrets`
- Consider using the official `cloudflare` npm package for type safety
- Should gracefully degrade if API unavailable
