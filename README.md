# alchemy-migrator

CLI tool to migrate Cloudflare Wrangler projects to Alchemy infrastructure-as-code.

## Features

- Migrate wrangler.toml/wrangler.json to alchemy.run.ts
- Auto-generate TypeScript types for worker environments
- Resource adoption (no downtime, no data loss)
- Support for KV, R2, D1, Queues, Durable Objects, and more
- Interactive mode for guided migration
- Dry-run mode to preview changes

## Installation

```bash
npm install
npm run build
```

## Usage

### Migrate a project

```bash
# Auto-discover wrangler config in current directory
node dist/cli/index.js migrate

# Specify config file
node dist/cli/index.js migrate wrangler.toml

# Interactive mode
node dist/cli/index.js migrate -i

# Dry run (preview without writing files)
node dist/cli/index.js migrate --dry-run
```

### Validate wrangler config

```bash
node dist/cli/index.js validate wrangler.toml
```

### Preview generated config

```bash
node dist/cli/index.js preview wrangler.toml
```

## Options

- `-o, --output <dir>` - Output directory (default: .)
- `-s, --stage <stage>` - Stage name (e.g., prod, dev)
- `--no-adopt` - Do not adopt existing resources
- `--no-preserve-names` - Generate new resource names
- `--env <environment>` - Target specific wrangler environment
- `-i, --interactive` - Interactive mode with prompts
- `--dry-run` - Preview changes without writing files

## Generated Files

- `alchemy.run.ts` - Alchemy infrastructure config
- `worker-env.d.ts` - TypeScript types for worker environment
- `.env.example` - Environment variables template
- `MIGRATION.md` - Migration guide and next steps

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Test
npm test
```

## License

MIT
