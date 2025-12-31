# Pages & Assets Migration Path

**Category:** New Feature
**Quarter:** Q2
**T-shirt Size:** L

## Why This Matters

Cloudflare Pages represents a massive segment of the Cloudflare developer ecosystem. Many users have:
- Static sites deployed via Pages
- Full-stack Pages applications with Functions
- Legacy Workers Sites using the `site` configuration

Currently, the migrator only warns about these configurations:
```
⚠️ Static site configuration should use Alchemy Assets resource
```

This leaves a large user base without a migration path, forcing them to either stay on wrangler or manually recreate their asset configuration in Alchemy.

## Current State

- `site` configuration (Workers Sites) → warning only
- `assets` configuration (modern Workers Assets) → warning only
- Pages projects → not supported at all
- No handling of `pages_build_output_dir`
- Framework integrations (Vite, SvelteKit, etc.) not considered

## Proposed Future State

Full migration support for static and hybrid deployments:

```bash
# Migrate a Pages project
$ alchemy-migrator migrate --pages ./my-nextjs-app

Detected: Next.js Pages project
  Build output: .vercel/output/static
  Functions: 3 API routes

Generating Alchemy configuration:
  - Assets directory: .vercel/output/static
  - 3 Pages functions → Worker routes
  - Environment variables migrated

# Migrate Workers Sites
$ alchemy-migrator migrate wrangler.toml

Converting Workers Sites to Alchemy Assets:
  - Bucket: ./public
  - Include: ["*.html", "*.js", "*.css"]
  - Exclude: ["*.map"]
```

**Generated output for Pages:**
```typescript
import alchemy from "alchemy";
import { Assets, Worker } from "alchemy/cloudflare";

const app = await alchemy("my-pages-app");

export const assets = await Assets("static-assets", {
  directory: ".vercel/output/static",
  htmlHandling: "auto-trailing-slash",
  notFoundHandling: "single-page-application",
});

export const worker = await Worker("functions", {
  entrypoint: "./.alchemy/pages-adapter.ts",
  assets: assets,
  routes: [
    { pattern: "example.com/api/*" }
  ],
});
```

## Key Deliverables

- [ ] Parse `site` config and convert to Alchemy Assets
- [ ] Parse `assets` config (new Workers Assets format)
- [ ] Detect Pages projects via `pages_build_output_dir` or framework detection
- [ ] Generate Alchemy Assets resource with proper options
- [ ] Handle html_handling and not_found_handling options
- [ ] Create Pages Functions → Worker adapter generation
- [ ] Support include/exclude patterns for asset upload
- [ ] Framework-specific adapters (Next.js, Nuxt, SvelteKit, Astro)
- [ ] Add `--pages` flag for explicit Pages migration mode
- [ ] Generate appropriate routing configuration

## Prerequisites

- 01-full-ir-layer (better resource modeling)

## Risks & Open Questions

- Pages Functions have different API than Workers - need adapter layer?
- Framework build outputs vary significantly
- Should we support `wrangler pages` config format directly?
- How to handle Pages environment variables vs. wrangler vars?
- Edge cases: custom builds, monorepo Pages projects

## Notes

- See `src/parsers/schema.ts:299-325` for existing site/assets schema
- Cloudflare Assets API: https://developers.cloudflare.com/workers/static-assets/
- Framework detection exists in `src/utils/file-utils.ts:detectProjectContext()`
- Consider generating a framework-specific adapter bundle
