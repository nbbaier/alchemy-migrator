# Plugin & Extension System

**Category:** Architecture
**Quarter:** Q4
**T-shirt Size:** L

## Why This Matters

No tool can anticipate every use case. Organizations have:

- Custom resource types
- Internal naming conventions
- Proprietary bindings (Cloudflare Enterprise features)
- Integration with internal systems
- Custom validation rules

A plugin system would enable the community to extend the migrator without forking, creating a sustainable ecosystem around the tool.

## Current State

- Hardcoded resource mappers
- Hardcoded binding transformers
- Hardcoded generators
- No extension points
- Custom behavior requires forking

## Proposed Future State

A flexible plugin architecture:

```typescript
// my-company-plugin.ts
import { definePlugin, type MigrationContext } from "alchemy-migrator";

export default definePlugin({
  name: "my-company-conventions",
  version: "1.0.0",

  // Add custom resource type
  resources: {
    "my-custom-binding": {
      schema: z.object({
        binding: z.string(),
        customField: z.string(),
      }),
      transform: (binding, ctx) => ({
        type: "CustomResource",
        id: binding.binding.toLowerCase(),
        props: { customField: binding.customField },
      }),
      generate: (resource, ctx) => `
        export const ${resource.id} = await CustomResource("${resource.id}", {
          customField: "${resource.props.customField}",
        });
      `,
    },
  },

  // Custom naming conventions
  hooks: {
    beforeTransform: (config, ctx) => {
      // Add company prefix to all resource names
      return config;
    },
    afterGenerate: (files, ctx) => {
      // Add copyright header
      return files.map(f => ({
        ...f,
        content: `// (c) My Company\n${f.content}`,
      }));
    },
  },

  // Custom validation
  validators: [
    (config) => {
      if (!config.name.startsWith("myco-")) {
        return { warning: "Worker name should start with 'myco-'" };
      }
    },
  ],
});
```

**Usage:**
```bash
$ alchemy-migrator migrate wrangler.toml --plugin ./my-company-plugin.ts
```

Or in config:
```json
// alchemy-migrator.config.json
{
  "plugins": [
    "./plugins/my-company-plugin.ts",
    "alchemy-migrator-plugin-terraform"
  ]
}
```

## Key Deliverables

- [ ] Design plugin API interface
- [ ] Implement plugin loader (local files + npm packages)
- [ ] Add resource extension points
- [ ] Add binding transformer extension points
- [ ] Add generator hooks (before/after)
- [ ] Add validator extension points
- [ ] Create plugin configuration file format
- [ ] Build plugin discovery from npm registry
- [ ] Add plugin scaffolding command (`alchemy-migrator create-plugin`)
- [ ] Create plugin documentation and examples
- [ ] Build plugin testing utilities
- [ ] Add plugin marketplace/registry concept

## Prerequisites

- 01-full-ir-layer (stable extension points)
- 09-programmatic-api-sdk (plugins need stable API)

## Risks & Open Questions

- Security: plugins can execute arbitrary code
- Versioning: plugin compatibility with migrator versions
- Conflicts: two plugins modifying same resource
- Discovery: how to find community plugins?
- Testing: how to test plugins in isolation?

## Notes

- Look at ESLint, Prettier, Babel plugin patterns
- Consider using Zod for plugin config validation
- Plugin hooks similar to build tool patterns (Vite, Webpack)
- Could support both TypeScript and JavaScript plugins
