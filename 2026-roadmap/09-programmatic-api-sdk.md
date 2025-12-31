# Programmatic API & SDK

**Category:** Integration
**Quarter:** Q3
**T-shirt Size:** M

## Why This Matters

The CLI is great for humans, but machines need APIs. Organizations want to:

- Embed migration in CI/CD pipelines
- Build custom tooling on top of the migrator
- Integrate with deployment platforms
- Automate bulk migrations
- Create custom reporting

A clean programmatic API would unlock ecosystem growth and enterprise adoption patterns that CLI-only tools cannot support.

## Current State

- CLI is the only interface
- Internal functions could be imported but aren't documented
- No stable public API contract
- No TypeScript type exports
- Exit codes are the only machine-readable output

## Proposed Future State

A well-documented, versioned SDK:

```typescript
import {
  parsWranglerConfig,
  transformConfig,
  generateAlchemyCode,
  validateConfig
} from "alchemy-migrator";

// Parse
const parsed = await parseWranglerConfig("./wrangler.toml");

// Validate
const validation = validateConfig(parsed.config);
if (!validation.valid) {
  console.error(validation.errors);
  process.exit(1);
}

// Transform with options
const alchemyConfig = transformConfig(parsed.config, {
  appName: "my-app",
  stage: "production",
  adopt: true,
});

// Generate output
const files = generateAlchemyCode(alchemyConfig);
for (const file of files) {
  await Bun.write(file.path, file.content);
}
```

**CI/CD Integration:**
```yaml
# GitHub Actions example
- name: Migrate Wrangler to Alchemy
  uses: alchemy-migrator/action@v1
  with:
    config: ./wrangler.toml
    output: ./alchemy
    validate: true
    commit: false
```

## Key Deliverables

- [ ] Export stable public API from package
- [ ] Create TypeScript type definitions for all public interfaces
- [ ] Document API with JSDoc comments
- [ ] Build GitHub Action for CI/CD integration
- [ ] Add JSON output mode for CLI (`--json`)
- [ ] Create structured error types with codes
- [ ] Add streaming API for large migrations
- [ ] Build event emitter for progress tracking
- [ ] Version API separately from CLI
- [ ] Create migration result object with metadata
- [ ] Add dry-run API that returns file contents without writing

## Prerequisites

- 01-full-ir-layer (stable internal types)

## Risks & Open Questions

- Semver: how to version internal vs. public API?
- Breaking changes: how to handle across major versions?
- Bundle size: tree-shakeable exports?
- Node.js vs. Bun compatibility for GitHub Action?
- Rate limiting for hosted API scenarios?

## Notes

- Current exports in `package.json` only define CLI entry
- Could use tsup or similar for clean ESM/CJS builds
- GitHub Action could wrap CLI or use SDK directly
- Consider OpenAPI spec if REST API needed
