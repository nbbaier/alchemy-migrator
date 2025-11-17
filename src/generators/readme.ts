import type { AlchemyConfig, MigrationMetadata } from "../types/alchemy.js";
import type { ProjectContext } from "../utils/file-utils.js";

export function generateMigrationReadme(
	config: AlchemyConfig,
	metadata: MigrationMetadata,
	projectContext: ProjectContext,
): string {
	const packageManager = projectContext.packageManager || "npm";

	return `# Migration to Alchemy

This project has been migrated from Wrangler to Alchemy.

## Migration Details

- **Source**: ${metadata.sourceFile}
- **Format**: ${metadata.sourceFormat}
- **Migrated**: ${metadata.migratedAt}
- **Tool Version**: ${metadata.version}

## Next Steps

### 1. Install Dependencies

\`\`\`bash
${packageManager} ${packageManager === "npm" ? "install" : "add"} alchemy
\`\`\`

### 2. Configure Environment Variables

Copy \`.env.example\` to \`.env\` and fill in your values:

\`\`\`bash
cp .env.example .env
\`\`\`

Required environment variables:
- \`CLOUDFLARE_ACCOUNT_ID\`: Your Cloudflare account ID
- \`CLOUDFLARE_API_TOKEN\`: Your Cloudflare API token with appropriate permissions
${
	config.secrets.length > 0
		? `- \`ALCHEMY_PASSWORD\`: Password for encrypting secrets
${config.secrets.map((s) => `- \`${s}\`: ${s.toLowerCase().replace(/_/g, " ")}`).join("\n")}`
		: ""
}

### 3. Review Generated Configuration

The migration tool has generated:
- \`alchemy.run.ts\`: Your infrastructure configuration
- \`worker-env.d.ts\`: TypeScript types for your worker environment
- \`.env.example\`: Template for environment variables

**Important**: Review \`alchemy.run.ts\` and verify:
- Resource names match your existing infrastructure
- All bindings are correctly mapped
- Routes and domains are properly configured

### 4. Deploy

Run the Alchemy configuration to deploy your infrastructure:

\`\`\`bash
${packageManager === "npm" ? "npx" : packageManager === "bun" ? "bun" : packageManager} alchemy.run.ts
\`\`\`

For production deployment with a specific stage:

\`\`\`bash
${packageManager === "npm" ? "npx" : packageManager === "bun" ? "bun" : packageManager} alchemy.run.ts --stage prod
\`\`\`

### 5. Local Development

To run your worker locally with Alchemy:

\`\`\`bash
${packageManager === "npm" ? "npx" : packageManager === "bun" ? "bun" : packageManager} alchemy dev
\`\`\`

Or with auto-reload:

\`\`\`bash
${packageManager === "bun" ? "bun --watch" : "node --watch"} alchemy.run.ts
\`\`\`

## Resource Adoption

This migration uses Alchemy's **resource adoption** feature to safely adopt your existing Cloudflare resources without recreating them.

All resources are configured with \`adopt: true\`, which means:
- ✅ Existing resources will be adopted (not recreated)
- ✅ No data loss or downtime
- ✅ State will be tracked in \`.alchemy/${config.stage || "{stage}"}/state.json\`

## Changes from Wrangler

### Configuration Format
- **Before**: \`wrangler.${metadata.sourceFormat}\` (TOML/JSON)
- **After**: \`alchemy.run.ts\` (TypeScript)

### Deployment
- **Before**: \`wrangler deploy\`
- **After**: \`${packageManager === "bun" ? "bun" : packageManager} alchemy.run.ts\`

### Local Development
- **Before**: \`wrangler dev\`
- **After**: \`${packageManager === "bun" ? "bun" : packageManager} alchemy dev\`

### Type Safety
Alchemy provides full TypeScript type inference for all bindings. Import the generated types:

\`\`\`typescript
import type { Env } from './worker-env';

export default {
  async fetch(request: Request, env: Env) {
    // env is fully typed!
    const value = await env.CACHE.get('key');
    return new Response('OK');
  }
};
\`\`\`

## Warnings and Manual Steps

${metadata.warnings.length > 0 ? metadata.warnings.map((w) => `- ⚠️ ${w}`).join("\n") : "_No warnings_"}

${
	metadata.manualSteps.length > 0
		? `### Manual Steps Required

${metadata.manualSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
		: ""
}

## State Management

Alchemy stores state in \`.alchemy/{stage}/state.json\`. You should:
- ✅ Add \`.alchemy/\` to \`.gitignore\`
- ✅ For CI/CD, consider using CloudflareStateStore or S3StateStore
- ✅ Set \`ALCHEMY_PASSWORD\` environment variable for secret encryption

## Learn More

- [Alchemy Documentation](https://alchemy.run/docs)
- [Alchemy GitHub](https://github.com/alchemy-run/alchemy)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Rollback

If you need to rollback to Wrangler:
1. Your original \`${metadata.sourceFile}\` is preserved
2. All resources remain unchanged (they were adopted, not recreated)
3. Simply run \`wrangler deploy\` as before

## Support

If you encounter issues:
1. Check the [Alchemy GitHub Issues](https://github.com/alchemy-run/alchemy/issues)
2. Review the migration warnings above
3. Verify your environment variables are set correctly
`;
}
