# Wrangler to Alchemy Migration Tool - Detailed Implementation Plan

## Project Overview

A CLI tool that automates migration from Cloudflare Wrangler projects (using `wrangler.toml` or `wrangler.json`) to Alchemy.run infrastructure-as-code configuration.

**Core Functionality:**

- Parse wrangler configuration files (TOML/JSON)
- Generate TypeScript `alchemy.run.ts` with proper resource definitions
- Generate type-safe worker environment types
- Preserve existing infrastructure through resource adoption
- Support multi-environment configurations
- Provide migration validation and verification

---

## Project Structure

```
alchemy-migrator/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   ├── commands/
│   │   │   ├── migrate.ts        # Main migration command
│   │   │   ├── validate.ts       # Validate wrangler config
│   │   │   ├── preview.ts        # Preview generated code
│   │   │   └── diff.ts           # Show migration diff
│   │   └── prompts.ts            # Interactive prompts
│   │
│   ├── parsers/
│   │   ├── index.ts              # Parser factory
│   │   ├── toml-parser.ts        # TOML parser implementation
│   │   ├── json-parser.ts        # JSON parser implementation
│   │   └── schema.ts             # Zod schemas for Wrangler config
│   │
│   ├── normalizers/
│   │   ├── index.ts              # Config normalization
│   │   ├── env-merger.ts         # Environment merging logic
│   │   └── stage-resolver.ts     # Stage and preview ID resolution
│   │
│   ├── ir/
│   │   ├── index.ts              # IR builder
│   │   ├── resource-registry.ts  # Central resource registry
│   │   ├── types.ts              # IR type definitions
│   │   └── validator.ts          # IR validation (cross-refs)
│   │
│   ├── transformers/
│   │   ├── index.ts              # Main transformer (Config → IR)
│   │   ├── resource-mapper.ts    # Maps wrangler → IR resources
│   │   ├── binding-transformer.ts # Transforms bindings
│   │   ├── route-transformer.ts  # Handles routes/domains
│   │   └── worker-transformer.ts # Worker-specific transforms
│   │
│   ├── generators/
│   │   ├── index.ts              # Generator orchestrator (IR → code)
│   │   ├── alchemy-config.ts     # Generates alchemy.run.ts
│   │   ├── types.ts              # Generates TypeScript types
│   │   ├── env-file.ts           # Generates .env template
│   │   ├── readme.ts             # Generates migration README
│   │   └── formatter.ts          # Prettier formatting
│   │
│   ├── validators/
│   │   ├── config-validator.ts   # Validates wrangler config (Zod)
│   │   ├── resource-validator.ts # Validates resource references
│   │   └── output-validator.ts   # Validates generated TS compiles
│   │
│   ├── utils/
│   │   ├── file-utils.ts         # File operations
│   │   ├── ast-builder.ts        # TypeScript AST utilities
│   │   ├── sorting.ts            # Deterministic sorting
│   │   ├── logger.ts             # Logging utilities
│   │   └── diff.ts               # Diff generation
│   │
│   └── types/
│       ├── wrangler.ts           # Wrangler configuration types (from Zod)
│       ├── ir.ts                 # Intermediate Representation types
│       ├── alchemy.ts            # Alchemy configuration types
│       └── migration.ts          # Migration metadata types
│
├── templates/
│   ├── alchemy.run.template.ts   # Base template
│   ├── worker-env.template.ts    # Worker env types template
│   └── migration-readme.template.md
│
├── tests/
│   ├── fixtures/
│   │   ├── wrangler.toml         # Sample configs
│   │   ├── wrangler.json
│   │   └── expected/             # Expected outputs
│   ├── unit/
│   │   ├── parsers.test.ts
│   │   ├── transformers.test.ts
│   │   └── generators.test.ts
│   └── integration/
│       └── migration.test.ts
│
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

---

## Architecture Overview

### Pipeline Flow

```
┌─────────────────┐
│ wrangler.toml   │
│ wrangler.json   │
└────────┬────────┘
         │
         ▼
   ┌──────────┐
   │  PARSE   │  (TOML/JSON → ParsedConfig)
   └────┬─────┘
        │
        ▼
  ┌───────────┐
  │ VALIDATE  │  (Zod schema validation)
  └────┬──────┘
       │
       ▼
  ┌────────────┐
  │ NORMALIZE  │  (Merge envs → NormalizedConfig)
  └────┬───────┘
       │
       ▼
  ┌──────────────┐
  │ BUILD IR     │  (Create ResourceRegistry + AlchemyIR)
  └────┬─────────┘
       │
       ▼
  ┌──────────────┐
  │ VALIDATE IR  │  (Cross-reference validation)
  └────┬─────────┘
       │
       ▼
  ┌──────────────┐
  │  GENERATE    │  (IR → TypeScript code)
  └────┬─────────┘
       │
       ▼
  ┌──────────────┐
  │  FORMAT      │  (Prettier + Sort + Validate)
  └────┬─────────┘
       │
       ▼
  ┌──────────────┐
  │ alchemy.run  │
  │ worker-env.d │
  │ .env.example │
  └──────────────┘
```

### Key Design Principles

1. **Explicit IR Layer**: Separate parsed config from generated code through a stable intermediate representation
2. **Resource Registry**: Central registry with stable keys for all resources (prevents duplicate refs)
3. **Deterministic Output**: Sorted, formatted, reproducible code generation
4. **Runtime Validation**: Zod schemas at parse time, TypeScript compilation at output time
5. **Safe Defaults**: Resource adoption, preserve names, comprehensive warnings

---

## Technical Specifications

### 1. Configuration Schema (Zod-based)

#### 1.1 Wrangler Configuration Schema

```typescript
// src/parsers/schema.ts

import { z } from 'zod';

/**
 * Complete Zod schema for wrangler.toml/json
 * Used for runtime validation during parsing
 */

// Basic worker configuration
const BaseWorkerSchema = z.object({
  name: z.string(),
  main: z.string().optional(),
  compatibility_date: z.string().optional(),
  compatibility_flags: z.array(z.string()).optional(),

  // Worker settings
  workers_dev: z.boolean().optional(),
  account_id: z.string().optional(),
  usage_model: z.enum(['bundled', 'unbound']).optional(),

  // Build/bundling
  node_compat: z.boolean().optional(),
  minify: z.boolean().optional(),
  no_bundle: z.boolean().optional(),
  tsconfig: z.string().optional(),

  // Build configuration
  build: z.object({
    command: z.string().optional(),
    cwd: z.string().optional(),
    watch_dirs: z.array(z.string()).optional(),
  }).optional(),

  // Module rules (text/wasm/data blobs)
  rules: z.array(z.object({
    type: z.string(),
    globs: z.array(z.string()),
    fallthrough: z.boolean().optional(),
  })).optional(),

  // Bindings - KV Namespaces
  kv_namespaces: z.array(z.object({
    binding: z.string(),
    id: z.string().optional(),
    preview_id: z.string().optional(),
  })).optional(),

  // Bindings - R2 Buckets
  r2_buckets: z.array(z.object({
    binding: z.string(),
    bucket_name: z.string(),
    preview_bucket_name: z.string().optional(),
    jurisdiction: z.enum(['eu', 'fedramp']).optional(),
  })).optional(),

  // Bindings - D1 Databases
  d1_databases: z.array(z.object({
    binding: z.string(),
    database_name: z.string(),
    database_id: z.string().optional(),
    preview_database_id: z.string().optional(),
    migrations_dir: z.string().optional(),
    migrations_table: z.string().optional(),
  })).optional(),

  // Bindings - Durable Objects
  durable_objects: z.object({
    bindings: z.array(z.object({
      name: z.string(),
      class_name: z.string(),
      script_name: z.string().optional(),
      environment: z.string().optional(),
    })).optional(),
    migrations: z.array(z.object({
      tag: z.string(),
      new_classes: z.array(z.string()).optional(),
      renamed_classes: z.array(z.object({
        from: z.string(),
        to: z.string(),
      })).optional(),
      deleted_classes: z.array(z.string()).optional(),
    })).optional(),
  }).optional();

  // Bindings - Queues
  queues: z.object({
    producers: z.array(z.object({
      binding: z.string(),
      queue: z.string(),
    })).optional(),
    consumers: z.array(z.object({
      queue: z.string(),
      max_batch_size: z.number().optional(),
      max_batch_timeout: z.number().optional(),
      max_retries: z.number().optional(),
      dead_letter_queue: z.string().optional(),
      max_concurrency: z.number().optional(), // IMPORTANT: Must be mapped!
    })).optional(),
  }).optional();

  // Bindings - Service Bindings
  services: z.array(z.object({
    binding: z.string(),
    service: z.string(),
    environment: z.string().optional(),
  })).optional(),

  // Bindings - Analytics Engine
  analytics_engine_datasets: z.array(z.object({
    binding: z.string(),
    dataset: z.string().optional(),
  })).optional(),

  // Bindings - Vectorize
  vectorize: z.array(z.object({
    binding: z.string(),
    index_name: z.string(),
  })).optional(),

  // Bindings - Hyperdrive
  hyperdrive: z.array(z.object({
    binding: z.string(),
    id: z.string(),
  })).optional(),

  // Bindings - AI
  ai: z.object({
    binding: z.string(),
  }).optional(),

  // Bindings - Browser Rendering
  browser: z.object({
    binding: z.string(),
  }).optional(),

  // Bindings - Dispatch Namespaces
  dispatch_namespaces: z.array(z.object({
    binding: z.string(),
    namespace: z.string(),
  })).optional();

  // Environment Variables
  vars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),

  // Text Blobs
  text_blobs: z.record(z.string()).optional(),

  // Data Blobs
  data_blobs: z.record(z.string()).optional(),

  // WASM Modules
  wasm_modules: z.record(z.string()).optional();

  // Unsafe Bindings
  unsafe: z.object({
    bindings: z.array(z.object({
      name: z.string(),
      type: z.string(),
    }).passthrough()).optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),

  // Triggers
  triggers: z.object({
    crons: z.array(z.string()).optional(),
  }).optional(),

  // Routes (array or single route)
  routes: z.array(z.union([
    z.string(),
    z.object({
      pattern: z.string(),
      zone_id: z.string().optional(),
      zone_name: z.string().optional(),
      custom_domain: z.boolean().optional(),
    }),
  ])).optional(),
  route: z.string().optional(), // Singular route (legacy)

  // Custom Domains
  workers_dot_dev: z.boolean().optional();

  // Observability
  observability: z.object({
    enabled: z.boolean().optional(),
    head_sampling_rate: z.number().optional(),
  }).optional(),

  // Logpush
  logpush: z.boolean().optional(),

  // Tail Consumers
  tail_consumers: z.array(z.object({
    service: z.string(),
    environment: z.string().optional(),
  })).optional(),

  // Placement
  placement: z.object({
    mode: z.enum(['smart']).optional(),
  }).optional(),

  // Limits
  limits: z.object({
    cpu_ms: z.number().optional(),
  }).optional(),

  // Static Assets (Workers Sites - legacy)
  site: z.object({
    bucket: z.string(),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  }).optional(),

  // Assets (new Workers Assets)
  assets: z.object({
    directory: z.string().optional(),
    binding: z.string().optional(),
    html_handling: z.enum(['auto-trailing-slash', 'force-trailing-slash', 'drop-trailing-slash', 'none']).optional(),
    not_found_handling: z.enum(['single-page-application', '404-page', 'none']).optional(),
  }).optional();

  // Dev configuration (not used in deployment, warn in README)
  dev: z.object({
    ip: z.string().optional(),
    port: z.number().optional(),
    local_protocol: z.enum(['http', 'https']).optional(),
    upstream_protocol: z.enum(['http', 'https']).optional(),
  }).optional(),

  // Environment-specific overrides
  env: z.record(z.lazy(() => BaseWorkerSchema.partial())).optional(),

  // Legacy/deprecated fields (for backwards compatibility)
  zone_id: z.string().optional(),
  type: z.string().optional(),
  webpack_config: z.string().optional(),

  // Framework-specific (Pages, etc.)
  pages_build_output_dir: z.string().optional(),
}).passthrough(); // Allow unknown fields in strict mode

export const WranglerConfigSchema = BaseWorkerSchema;

// Infer TypeScript type from Zod schema
export type WranglerConfig = z.infer<typeof WranglerConfigSchema>;

/**
 * Normalized configuration after parsing and environment merging
 */
export interface NormalizedWranglerConfig extends WranglerConfig {
  // Guaranteed to have these fields after normalization
  name: string;
  main: string;
  compatibility_date: string;

  // Environments extracted and normalized
  environments: Record<string, WranglerConfig>;

  // Metadata about normalization
  _meta: {
    sourceFormat: 'toml' | 'json';
    selectedEnv?: string;
    hasPreviewIds: boolean;
  };
}
```

#### 1.2 Intermediate Representation (IR)

```typescript
// src/types/ir.ts

/**
 * Intermediate Representation - stable layer between parsing and generation
 *
 * Purpose:
 * - Decouple input format (wrangler) from output format (alchemy)
 * - Provide stable resource keys for references
 * - Enable validation and transformation without coupling to either format
 */

export type ResourceKey = `${ResourceType}:${string}`;
export type ResourceType =
   | "kv"
   | "r2"
   | "d1"
   | "queue"
   | "do"
   | "service"
   | "hyperdrive"
   | "vectorize"
   | "ai"
   | "browser"
   | "analytics"
   | "dispatch";

/**
 * Central resource registry with stable keys
 */
export interface ResourceRegistry {
   resources: Map<ResourceKey, IRResource>;

   // Helper methods
   get(key: ResourceKey): IRResource | undefined;
   set(key: ResourceKey, resource: IRResource): void;
   has(key: ResourceKey): boolean;
   getVariableName(key: ResourceKey): string | undefined;
}

/**
 * IR Resource - normalized representation of any resource
 */
export interface IRResource {
   // Stable identifier
   key: ResourceKey;
   type: ResourceType;

   // Code generation
   variableName: string; // e.g., "cache", "bucket", "db"
   exported: boolean;

   // Alchemy-specific props
   alchemyType: string; // e.g., "KVNamespace", "R2Bucket"
   alchemyId: string; // First param to resource constructor
   props: Record<string, unknown>;

   // Metadata
   adopt: boolean;
   fromEnv?: string; // Which env this came from (if any)
   hasPreviewId: boolean;
}

/**
 * IR Binding - normalized binding reference
 */
export type IRBinding =
   | { type: "resource"; key: ResourceKey }
   | { type: "secret"; name: string; envVar: string }
   | { type: "text"; value: string }
   | { type: "json"; value: unknown }
   | { type: "service"; service: string; environment?: string };

/**
 * IR Worker - complete worker definition
 */
export interface IRWorker {
   id: string;
   variableName: string;

   // Worker props
   name: string;
   entrypoint: string;
   compatibilityDate: string;
   compatibilityFlags?: string[];

   // Bindings (sorted alphabetically for determinism)
   bindings: Map<string, IRBinding>;

   // Routes and domains
   routes?: IRRoute[];
   domains?: string[];

   // Triggers
   crons?: string[];

   // Queue consumers
   consumers?: IRQueueConsumer[];

   // Observability
   observability?: {
      enabled: boolean;
      headSamplingRate?: number;
   };

   // Placement
   placement?: {
      mode: "smart";
   };

   // Other worker config
   usage_model?: "bundled" | "unbound";
   logpush?: boolean;
}

export interface IRRoute {
   pattern: string;
   zoneId?: string;
   zoneName?: string;
   customDomain?: boolean;
}

export interface IRQueueConsumer {
   queueKey: ResourceKey;
   settings: {
      batchSize?: number;
      maxWaitTimeMs?: number;
      maxRetries?: number;
      maxConcurrency?: number; // IMPORTANT: Must be preserved!
      deadLetterQueue?: ResourceKey;
   };
}

/**
 * Complete IR - ready for code generation
 */
export interface AlchemyIR {
   appName: string;
   stage?: string;

   // All resources (sorted for determinism)
   registry: ResourceRegistry;

   // Workers
   workers: IRWorker[];

   // Warnings and manual steps
   warnings: string[];
   manualSteps: string[];

   // Metadata
   meta: {
      sourceFormat: "toml" | "json";
      sourceFile: string;
      migratedAt: string;
      version: string;
   };
}
```

#### 1.3 Alchemy Configuration Types

```typescript
// src/types/alchemy.ts

import type {
   KVNamespaceProps,
   R2BucketProps,
   D1DatabaseProps,
   QueueProps,
   WorkerProps,
   DurableObjectNamespaceProps,
} from "alchemy/cloudflare";

/**
 * Intermediate representation of Alchemy configuration
 * Used to generate the final alchemy.run.ts file
 */
export interface AlchemyConfig {
   appName: string;
   stage?: string;
   resources: AlchemyResource[];
   workers: AlchemyWorker[];
   secrets: string[];
   plainTextVars: Record<string, string>;
}

export interface AlchemyResource {
   type:
      | "KVNamespace"
      | "R2Bucket"
      | "D1Database"
      | "Queue"
      | "DurableObjectNamespace";
   id: string; // Resource identifier in code
   variableName: string; // Variable name to export
   props: any; // Type-specific props
   adopt: boolean;
}

export interface AlchemyWorker {
   id: string;
   variableName: string;
   props: Partial<WorkerProps>;
   bindings: Record<string, AlchemyBinding>;
   routes?: Array<{
      pattern: string;
      zoneId?: string;
      zoneName?: string;
   }>;
   domains?: string[];
   crons?: string[];
   eventSources?: Array<{
      queueRef: string;
      settings?: any;
   }>;
}

export type AlchemyBinding =
   | { type: "resource"; resourceRef: string }
   | { type: "secret"; secretName: string }
   | { type: "plainText"; value: string }
   | { type: "json"; value: any };

/**
 * Metadata about the migration
 */
export interface MigrationMetadata {
   sourceFile: string;
   sourceFormat: "toml" | "json";
   migratedAt: string;
   warnings: string[];
   manualSteps: string[];
   version: string;
}
```

#### 1.3 Migration Output Structure

```typescript
// src/types/migration.ts

export interface MigrationOutput {
   files: Array<{
      path: string;
      content: string;
      overwrite: boolean;
   }>;
   metadata: MigrationMetadata;
   instructions: string[];
}

export interface MigrationOptions {
   sourceFile: string;
   outputDir: string;
   stage?: string;
   adopt?: boolean; // Default true
   preserveNames?: boolean; // Use exact wrangler names
   interactive?: boolean;
   dryRun?: boolean;
}
```

---

### 2. Parser Implementation

#### 2.1 Parser Factory

```typescript
// src/parsers/index.ts

import { readFileSync } from "fs";
import { parse as parseToml } from "@iarna/toml";
import { WranglerConfig, NormalizedWranglerConfig } from "../types/wrangler";
import { validateConfig } from "../validators/config-validator";

export type ConfigFormat = "toml" | "json";

export interface ParserResult {
   config: NormalizedWranglerConfig;
   format: ConfigFormat;
   warnings: string[];
}

/**
 * Detects and parses wrangler configuration file
 */
export async function parseWranglerConfig(
   filePath: string
): Promise<ParserResult> {
   const format = detectFormat(filePath);
   const content = readFileSync(filePath, "utf-8");

   let rawConfig: WranglerConfig;

   if (format === "toml") {
      rawConfig = parseToml(content) as WranglerConfig;
   } else {
      rawConfig = JSON.parse(content) as WranglerConfig;
   }

   // Validate configuration
   const validation = validateConfig(rawConfig);

   // Normalize configuration
   const normalized = normalizeConfig(rawConfig);

   return {
      config: normalized,
      format,
      warnings: validation.warnings,
   };
}

function detectFormat(filePath: string): ConfigFormat {
   if (filePath.endsWith(".toml")) return "toml";
   if (filePath.endsWith(".json")) return "json";
   throw new Error("Unsupported config format. Must be .toml or .json");
}

/**
 * Normalizes configuration by:
 * - Extracting environment-specific configs
 * - Setting defaults
 * - Resolving inheritance
 */
function normalizeConfig(config: WranglerConfig): NormalizedWranglerConfig {
   const baseConfig: WranglerConfig = { ...config };
   delete baseConfig.env;

   const environments: Record<string, WranglerConfig> = {};

   // Extract and merge environment configs
   if (config.env) {
      for (const [envName, envConfig] of Object.entries(config.env)) {
         environments[envName] = mergeConfigs(baseConfig, envConfig);
      }
   }

   // Ensure required fields have defaults
   const normalized: NormalizedWranglerConfig = {
      ...baseConfig,
      name: config.name || "unnamed-worker",
      main: config.main || "src/index.js",
      compatibility_date:
         config.compatibility_date || new Date().toISOString().split("T")[0],
      environments,
   };

   return normalized;
}

function mergeConfigs(
   base: WranglerConfig,
   override: Partial<WranglerConfig>
): WranglerConfig {
   return {
      ...base,
      ...override,
      // Deep merge arrays
      kv_namespaces: override.kv_namespaces || base.kv_namespaces,
      r2_buckets: override.r2_buckets || base.r2_buckets,
      d1_databases: override.d1_databases || base.d1_databases,
      // Merge objects
      vars: { ...base.vars, ...override.vars },
      // Override other fields
   };
}
```

#### 2.2 Configuration Auto-discovery

```typescript
// src/utils/file-utils.ts

import { existsSync } from "fs";
import { join } from "path";

export interface DiscoveredConfig {
   path: string;
   format: ConfigFormat;
}

/**
 * Auto-discovers wrangler configuration in a directory
 */
export function discoverWranglerConfig(dir: string): DiscoveredConfig | null {
   const candidates = [
      { path: join(dir, "wrangler.json"), format: "json" as const },
      { path: join(dir, "wrangler.toml"), format: "toml" as const },
   ];

   for (const candidate of candidates) {
      if (existsSync(candidate.path)) {
         return candidate;
      }
   }

   return null;
}

/**
 * Detects project type based on package.json and other indicators
 */
export interface ProjectContext {
   hasPackageJson: boolean;
   framework?: "vite" | "nuxt" | "sveltekit" | "astro" | "remix" | "next";
   packageManager?: "npm" | "yarn" | "pnpm" | "bun";
   typescript: boolean;
   hasSourceDir: boolean;
   entrypoint?: string;
}

export function detectProjectContext(dir: string): ProjectContext {
   const context: ProjectContext = {
      hasPackageJson: existsSync(join(dir, "package.json")),
      typescript: existsSync(join(dir, "tsconfig.json")),
      hasSourceDir: existsSync(join(dir, "src")),
   };

   if (context.hasPackageJson) {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));

      // Detect framework
      if (pkg.dependencies?.vite || pkg.devDependencies?.vite)
         context.framework = "vite";
      if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt)
         context.framework = "nuxt";
      if (pkg.dependencies?.["@sveltejs/kit"]) context.framework = "sveltekit";
      if (pkg.dependencies?.astro) context.framework = "astro";

      // Detect package manager
      if (existsSync(join(dir, "bun.lockb"))) context.packageManager = "bun";
      else if (existsSync(join(dir, "pnpm-lock.yaml")))
         context.packageManager = "pnpm";
      else if (existsSync(join(dir, "yarn.lock")))
         context.packageManager = "yarn";
      else if (existsSync(join(dir, "package-lock.json")))
         context.packageManager = "npm";
   }

   // Try to detect entrypoint
   const possibleEntrypoints = [
      "src/index.ts",
      "src/index.js",
      "src/worker.ts",
      "src/worker.js",
      "index.ts",
      "index.js",
   ];

   for (const entry of possibleEntrypoints) {
      if (existsSync(join(dir, entry))) {
         context.entrypoint = entry;
         break;
      }
   }

   return context;
}
```

---

### 3. Transformation Layer

#### 3.1 Resource Mapper

```typescript
// src/transformers/resource-mapper.ts

import type { WranglerConfig } from "../types/wrangler";
import type { AlchemyResource } from "../types/alchemy";

export interface ResourceMappingOptions {
   adopt: boolean;
   preserveNames: boolean;
   stage?: string;
   appName: string;
}

/**
 * Maps wrangler resources to Alchemy resources
 */
export class ResourceMapper {
   constructor(private options: ResourceMappingOptions) {}

   /**
    * Map KV Namespaces
    */
   mapKVNamespaces(
      kvNamespaces?: WranglerConfig["kv_namespaces"]
   ): AlchemyResource[] {
      if (!kvNamespaces || kvNamespaces.length === 0) return [];

      return kvNamespaces.map((kv, index) => {
         const id = this.sanitizeId(kv.binding.toLowerCase());
         const variableName = this.generateVariableName("kv", id, index);

         const title =
            this.options.preserveNames && kv.id
               ? kv.binding // Use exact binding name
               : this.generateResourceName("kv", id);

         return {
            type: "KVNamespace",
            id,
            variableName,
            adopt: this.options.adopt,
            props: {
               title,
               adopt: this.options.adopt,
            },
         };
      });
   }

   /**
    * Map R2 Buckets
    */
   mapR2Buckets(r2Buckets?: WranglerConfig["r2_buckets"]): AlchemyResource[] {
      if (!r2Buckets || r2Buckets.length === 0) return [];

      return r2Buckets.map((bucket, index) => {
         const id = this.sanitizeId(bucket.binding.toLowerCase());
         const variableName = this.generateVariableName("bucket", id, index);

         const name = this.options.preserveNames
            ? bucket.bucket_name
            : this.generateResourceName("bucket", id);

         return {
            type: "R2Bucket",
            id,
            variableName,
            adopt: this.options.adopt,
            props: {
               name,
               jurisdiction: bucket.jurisdiction,
               adopt: this.options.adopt,
            },
         };
      });
   }

   /**
    * Map D1 Databases
    */
   mapD1Databases(
      d1Databases?: WranglerConfig["d1_databases"]
   ): AlchemyResource[] {
      if (!d1Databases || d1Databases.length === 0) return [];

      return d1Databases.map((db, index) => {
         const id = this.sanitizeId(db.binding.toLowerCase());
         const variableName = this.generateVariableName("db", id, index);

         const name = this.options.preserveNames
            ? db.database_name
            : this.generateResourceName("db", id);

         return {
            type: "D1Database",
            id,
            variableName,
            adopt: this.options.adopt,
            props: {
               name,
               migrationsDir: db.migrations_dir || undefined,
               adopt: this.options.adopt,
            },
         };
      });
   }

   /**
    * Map Queue Producers
    */
   mapQueues(queues?: WranglerConfig["queues"]): AlchemyResource[] {
      if (!queues?.producers || queues.producers.length === 0) return [];

      return queues.producers.map((queue, index) => {
         const id = this.sanitizeId(queue.binding.toLowerCase());
         const variableName = this.generateVariableName("queue", id, index);

         const name = this.options.preserveNames
            ? queue.queue
            : this.generateResourceName("queue", id);

         return {
            type: "Queue",
            id,
            variableName,
            adopt: this.options.adopt,
            props: {
               name,
               adopt: this.options.adopt,
            },
         };
      });
   }

   /**
    * Map Durable Object Namespaces
    * NOTE: These are NOT awaited in Alchemy
    */
   mapDurableObjects(
      durableObjects?: WranglerConfig["durable_objects"]
   ): AlchemyResource[] {
      if (!durableObjects?.bindings || durableObjects.bindings.length === 0)
         return [];

      return durableObjects.bindings.map((do_, index) => {
         const id = this.sanitizeId(do_.name.toLowerCase());
         const variableName = this.generateVariableName("do", id, index);

         return {
            type: "DurableObjectNamespace",
            id,
            variableName,
            adopt: false, // DOs typically defined in same worker
            props: {
               className: do_.class_name,
               scriptName: do_.script_name,
               // Note: sqlite option not in wrangler config
            },
         };
      });
   }

   private sanitizeId(id: string): string {
      return id.replace(/[^a-z0-9_]/gi, "_");
   }

   private generateVariableName(
      prefix: string,
      id: string,
      index: number
   ): string {
      // If ID is meaningful, use it; otherwise use index
      if (id && id !== "binding" && id !== prefix) {
         return `${id}`;
      }
      return `${prefix}${index > 0 ? index + 1 : ""}`;
   }

   private generateResourceName(type: string, id: string): string {
      const parts = [this.options.appName];

      if (id && id !== type) {
         parts.push(id);
      } else {
         parts.push(type);
      }

      if (this.options.stage) {
         parts.push(this.options.stage);
      }

      return parts.join("-");
   }
}
```

#### 3.2 Binding Transformer

```typescript
// src/transformers/binding-transformer.ts

import type { WranglerConfig } from "../types/wrangler";
import type { AlchemyBinding } from "../types/alchemy";

export interface BindingContext {
   resources: Map<string, string>; // binding name -> variable name
   secrets: Set<string>;
}

/**
 * Transforms wrangler bindings to Alchemy bindings
 */
export class BindingTransformer {
   /**
    * Build bindings from all wrangler binding types
    */
   static transformBindings(
      config: WranglerConfig,
      context: BindingContext
   ): Record<string, AlchemyBinding> {
      const bindings: Record<string, AlchemyBinding> = {};

      // KV Namespaces
      if (config.kv_namespaces) {
         for (const kv of config.kv_namespaces) {
            const resourceVar = context.resources.get(`kv:${kv.binding}`);
            if (resourceVar) {
               bindings[kv.binding] = {
                  type: "resource",
                  resourceRef: resourceVar,
               };
            }
         }
      }

      // R2 Buckets
      if (config.r2_buckets) {
         for (const bucket of config.r2_buckets) {
            const resourceVar = context.resources.get(`r2:${bucket.binding}`);
            if (resourceVar) {
               bindings[bucket.binding] = {
                  type: "resource",
                  resourceRef: resourceVar,
               };
            }
         }
      }

      // D1 Databases
      if (config.d1_databases) {
         for (const db of config.d1_databases) {
            const resourceVar = context.resources.get(`d1:${db.binding}`);
            if (resourceVar) {
               bindings[db.binding] = {
                  type: "resource",
                  resourceRef: resourceVar,
               };
            }
         }
      }

      // Queue Producers
      if (config.queues?.producers) {
         for (const queue of config.queues.producers) {
            const resourceVar = context.resources.get(`queue:${queue.binding}`);
            if (resourceVar) {
               bindings[queue.binding] = {
                  type: "resource",
                  resourceRef: resourceVar,
               };
            }
         }
      }

      // Durable Objects
      if (config.durable_objects?.bindings) {
         for (const do_ of config.durable_objects.bindings) {
            const resourceVar = context.resources.get(`do:${do_.name}`);
            if (resourceVar) {
               bindings[do_.name] = {
                  type: "resource",
                  resourceRef: resourceVar,
               };
            }
         }
      }

      // Environment Variables
      if (config.vars) {
         for (const [key, value] of Object.entries(config.vars)) {
            // Check if this should be a secret
            if (this.shouldBeSecret(key)) {
               bindings[key] = {
                  type: "secret",
                  secretName: key,
               };
               context.secrets.add(key);
            } else if (typeof value === "string") {
               bindings[key] = {
                  type: "plainText",
                  value: value,
               };
            } else {
               // Numbers, booleans, or objects become JSON bindings
               bindings[key] = {
                  type: "json",
                  value: value,
               };
            }
         }
      }

      // Service Bindings
      if (config.services) {
         // Note: Service bindings require special handling
         // For now, add as comment/warning
      }

      return bindings;
   }

   /**
    * Heuristic to determine if a variable should be a secret
    */
   private static shouldBeSecret(key: string): boolean {
      const secretPatterns = [
         /api[_-]?key/i,
         /secret/i,
         /password/i,
         /token/i,
         /private[_-]?key/i,
         /auth/i,
         /credential/i,
      ];

      return secretPatterns.some((pattern) => pattern.test(key));
   }
}
```

#### 3.3 Main Transformer

```typescript
// src/transformers/index.ts

import type { NormalizedWranglerConfig } from "../types/wrangler";
import type { AlchemyConfig, AlchemyWorker } from "../types/alchemy";
import { ResourceMapper } from "./resource-mapper";
import { BindingTransformer } from "./binding-transformer";

export interface TransformOptions {
   appName?: string;
   stage?: string;
   adopt?: boolean;
   preserveNames?: boolean;
   targetEnvironment?: string; // Which env from config to use
}

/**
 * Main transformer that converts WranglerConfig to AlchemyConfig
 */
export class ConfigTransformer {
   transform(
      wranglerConfig: NormalizedWranglerConfig,
      options: TransformOptions = {}
   ): AlchemyConfig {
      const appName = options.appName || wranglerConfig.name;
      const stage = options.stage;
      const adopt = options.adopt ?? true;
      const preserveNames = options.preserveNames ?? true;

      // Select which config to use (base or specific environment)
      const targetConfig = options.targetEnvironment
         ? wranglerConfig.environments[options.targetEnvironment]
         : wranglerConfig;

      // Initialize mapper
      const mapper = new ResourceMapper({
         adopt,
         preserveNames,
         stage,
         appName,
      });

      // Map all resources
      const resources = [
         ...mapper.mapKVNamespaces(targetConfig.kv_namespaces),
         ...mapper.mapR2Buckets(targetConfig.r2_buckets),
         ...mapper.mapD1Databases(targetConfig.d1_databases),
         ...mapper.mapQueues(targetConfig.queues),
         ...mapper.mapDurableObjects(targetConfig.durable_objects),
      ];

      // Build resource lookup map
      const resourceMap = new Map<string, string>();
      for (const resource of resources) {
         const key = `${resource.type.toLowerCase()}:${resource.id}`;
         resourceMap.set(key, resource.variableName);
      }

      // Transform bindings
      const secrets = new Set<string>();
      const bindingContext = { resources: resourceMap, secrets };
      const bindings = BindingTransformer.transformBindings(
         targetConfig,
         bindingContext
      );

      // Build worker configuration
      const worker: AlchemyWorker = {
         id: "worker",
         variableName: "worker",
         props: {
            name: preserveNames
               ? targetConfig.name
               : stage
                 ? `${appName}-${stage}`
                 : appName,
            entrypoint: targetConfig.main || "./src/index.js",
            compatibilityDate: targetConfig.compatibility_date,
            compatibilityFlags: targetConfig.compatibility_flags,
            observability: targetConfig.observability,
         },
         bindings,
         routes: this.transformRoutes(targetConfig.routes),
         crons: targetConfig.triggers?.crons,
         eventSources: this.transformQueueConsumers(
            targetConfig.queues?.consumers,
            resourceMap
         ),
      };

      return {
         appName,
         stage,
         resources,
         workers: [worker],
         secrets: Array.from(secrets),
         plainTextVars: this.extractPlainVars(targetConfig.vars || {}, secrets),
      };
   }

   private transformRoutes(routes?: WranglerConfig["routes"]) {
      if (!routes) return undefined;

      return routes.map((route) => {
         if (typeof route === "string") {
            return { pattern: route };
         }
         return {
            pattern: route.pattern,
            zoneId: route.zone_id,
            zoneName: route.zone_name,
         };
      });
   }

   private transformQueueConsumers(
      consumers: WranglerConfig["queues"]["consumers"],
      resourceMap: Map<string, string>
   ) {
      if (!consumers || consumers.length === 0) return undefined;

      return consumers.map((consumer) => ({
         queueRef: resourceMap.get(`queue:${consumer.queue}`) || consumer.queue,
         settings: {
            batchSize: consumer.max_batch_size,
            maxWaitTimeMs: consumer.max_batch_timeout,
            maxRetries: consumer.max_retries,
            deadLetterQueue: consumer.dead_letter_queue,
         },
      }));
   }

   private extractPlainVars(
      vars: Record<string, any>,
      secrets: Set<string>
   ): Record<string, string> {
      const plainVars: Record<string, string> = {};

      for (const [key, value] of Object.entries(vars)) {
         if (!secrets.has(key) && typeof value === "string") {
            plainVars[key] = value;
         }
      }

      return plainVars;
   }
}
```

---

### 4. Code Generation

#### 4.1 TypeScript AST Builder

```typescript
// src/utils/ast-builder.ts

/**
 * Utilities for building TypeScript code programmatically
 */

export interface ImportStatement {
   named?: string[];
   default?: string;
   namespace?: string;
   from: string;
}

export class TypeScriptBuilder {
   private lines: string[] = [];
   private indentLevel = 0;

   addImport(stmt: ImportStatement): this {
      let importStr = "import ";

      const parts: string[] = [];

      if (stmt.default) {
         parts.push(stmt.default);
      }

      if (stmt.named && stmt.named.length > 0) {
         parts.push(`{ ${stmt.named.join(", ")} }`);
      }

      if (stmt.namespace) {
         parts.push(`* as ${stmt.namespace}`);
      }

      importStr += parts.join(", ");
      importStr += ` from "${stmt.from}";`;

      this.lines.push(importStr);
      return this;
   }

   addLine(line: string = ""): this {
      if (line) {
         this.lines.push("  ".repeat(this.indentLevel) + line);
      } else {
         this.lines.push("");
      }
      return this;
   }

   addComment(comment: string): this {
      return this.addLine(`// ${comment}`);
   }

   addBlockComment(lines: string[]): this {
      this.addLine("/**");
      lines.forEach((line) => this.addLine(` * ${line}`));
      this.addLine(" */");
      return this;
   }

   indent(): this {
      this.indentLevel++;
      return this;
   }

   dedent(): this {
      this.indentLevel = Math.max(0, this.indentLevel - 1);
      return this;
   }

   addConstDeclaration(name: string, value: string, exported = true): this {
      const prefix = exported ? "export const" : "const";
      return this.addLine(`${prefix} ${name} = ${value};`);
   }

   addAwaitConstDeclaration(
      name: string,
      value: string,
      exported = true
   ): this {
      const prefix = exported ? "export const" : "const";
      return this.addLine(`${prefix} ${name} = await ${value};`);
   }

   addObjectLiteral(obj: Record<string, any>, multiline = true): string {
      if (!multiline || Object.keys(obj).length === 0) {
         return JSON.stringify(obj);
      }

      const entries = Object.entries(obj).map(([key, value]) => {
         const valueStr = this.formatValue(value);
         // Use quotes for keys with special characters
         const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
            ? key
            : `"${key}"`;
         return `${keyStr}: ${valueStr}`;
      });

      return `{\n${"  ".repeat(this.indentLevel + 1)}${entries.join(",\n" + "  ".repeat(this.indentLevel + 1))}\n${"  ".repeat(this.indentLevel)}}`;
   }

   private formatValue(value: any): string {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "string") {
         // Check if it's a reference (no quotes)
         if (value.startsWith("$ref:")) {
            return value.substring(5);
         }
         return `"${value.replace(/"/g, '\\"')}"`;
      }
      if (typeof value === "number" || typeof value === "boolean") {
         return String(value);
      }
      if (Array.isArray(value)) {
         if (value.length === 0) return "[]";
         const items = value.map((v) => this.formatValue(v));
         return `[${items.join(", ")}]`;
      }
      if (typeof value === "object") {
         return this.addObjectLiteral(value, true);
      }
      return String(value);
   }

   build(): string {
      return this.lines.join("\n");
   }
}
```

#### 4.2 Alchemy Config Generator

```typescript
// src/generators/alchemy-config.ts

import type {
   AlchemyConfig,
   AlchemyResource,
   AlchemyWorker,
} from "../types/alchemy";
import { TypeScriptBuilder } from "../utils/ast-builder";

export function generateAlchemyConfig(config: AlchemyConfig): string {
   const builder = new TypeScriptBuilder();

   // Add header comment
   builder.addBlockComment([
      "Alchemy Configuration",
      "Generated by alchemy-migrator",
      `Generated at: ${new Date().toISOString()}`,
      "",
      "Learn more: https://alchemy.run",
   ]);

   builder.addLine();

   // Add imports
   builder.addImport({ default: "alchemy", from: "alchemy" });

   const resourceTypes = new Set(config.resources.map((r) => r.type));
   if (resourceTypes.size > 0) {
      builder.addImport({
         named: Array.from(resourceTypes),
         from: "alchemy/cloudflare",
      });
   }

   builder.addLine();
   builder.addLine();

   // Initialize app
   builder.addComment("Initialize Alchemy app");
   const appInit = config.stage
      ? `alchemy("${config.appName}", { stage: "${config.stage}" })`
      : `alchemy("${config.appName}")`;
   builder.addConstDeclaration("app", `await ${appInit}`, false);

   builder.addLine();
   builder.addLine();

   // Add resources
   if (config.resources.length > 0) {
      builder.addComment("Define resources");
      builder.addLine();

      for (const resource of config.resources) {
         generateResource(builder, resource);
         builder.addLine();
      }
   }

   // Add workers
   if (config.workers.length > 0) {
      builder.addComment("Define workers");
      builder.addLine();

      for (const worker of config.workers) {
         generateWorker(builder, worker, config);
         builder.addLine();
      }
   }

   // Add finalize
   builder.addComment("Clean up orphaned resources");
   builder.addLine("await app.finalize();");

   return builder.build();
}

function generateResource(
   builder: TypeScriptBuilder,
   resource: AlchemyResource
): void {
   const props = { ...resource.props };

   // Add adopt flag if not already present
   if (resource.adopt && !props.adopt) {
      props.adopt = true;
   }

   const propsStr = builder.addObjectLiteral(props, true);

   if (resource.type === "DurableObjectNamespace") {
      // DurableObjectNamespace is NOT awaited
      builder.addConstDeclaration(
         resource.variableName,
         `${resource.type}("${resource.id}", ${propsStr})`,
         true
      );
   } else {
      builder.addAwaitConstDeclaration(
         resource.variableName,
         `${resource.type}("${resource.id}", ${propsStr})`,
         true
      );
   }
}

function generateWorker(
   builder: TypeScriptBuilder,
   worker: AlchemyWorker,
   config: AlchemyConfig
): void {
   const props: any = { ...worker.props };

   // Add bindings
   if (Object.keys(worker.bindings).length > 0) {
      const bindings: Record<string, any> = {};

      for (const [key, binding] of Object.entries(worker.bindings)) {
         switch (binding.type) {
            case "resource":
               bindings[key] = `$ref:${binding.resourceRef}`;
               break;
            case "secret":
               bindings[key] =
                  `$ref:alchemy.secret(process.env.${binding.secretName})`;
               break;
            case "plainText":
               bindings[key] = binding.value;
               break;
            case "json":
               bindings[key] = binding.value;
               break;
         }
      }

      props.bindings = bindings;
   }

   // Add routes
   if (worker.routes && worker.routes.length > 0) {
      props.routes = worker.routes;
   }

   // Add crons
   if (worker.crons && worker.crons.length > 0) {
      props.crons = worker.crons;
   }

   // Add event sources
   if (worker.eventSources && worker.eventSources.length > 0) {
      props.eventSources = worker.eventSources.map((es) => ({
         queue: `$ref:${es.queueRef}`,
         settings: es.settings,
      }));
   }

   const propsStr = builder.addObjectLiteral(props, true);

   builder.addAwaitConstDeclaration(
      worker.variableName,
      `Worker("${worker.id}", ${propsStr})`,
      true
   );
}
```

#### 4.3 Environment Types Generator

```typescript
// src/generators/types.ts

import type { AlchemyWorker } from "../types/alchemy";
import { TypeScriptBuilder } from "../utils/ast-builder";

export function generateWorkerTypes(worker: AlchemyWorker): string {
   const builder = new TypeScriptBuilder();

   builder.addBlockComment([
      "Worker Environment Types",
      "Auto-generated type definitions for worker bindings",
   ]);

   builder.addLine();

   // Import worker reference
   builder.addImport({
      named: ["worker"],
      from: "./alchemy.run",
   });

   builder.addLine();
   builder.addLine();

   // Generate Env type
   builder.addComment("Use this type for your worker environment");
   builder.addLine("export type Env = typeof worker.Env;");

   builder.addLine();
   builder.addLine();

   // Add usage example
   builder.addBlockComment([
      "Usage in your worker:",
      "",
      'import type { Env } from "./worker-env";',
      "",
      "export default {",
      "  async fetch(request: Request, env: Env, ctx: ExecutionContext) {",
      "    // env is fully typed with all your bindings",
      '    const value = await env.CACHE.get("key");',
      '    return new Response("OK");',
      "  }",
      "};",
   ]);

   return builder.build();
}
```

#### 4.4 Environment Variables Template

```typescript
// src/generators/env-file.ts

import type { AlchemyConfig } from "../types/alchemy";

export function generateEnvTemplate(config: AlchemyConfig): string {
   const lines: string[] = [];

   lines.push("# Environment Variables for Alchemy");
   lines.push("# Generated by alchemy-migrator");
   lines.push("");

   // Cloudflare credentials
   lines.push("# Cloudflare Credentials");
   lines.push("CLOUDFLARE_ACCOUNT_ID=your-account-id");
   lines.push("CLOUDFLARE_API_TOKEN=your-api-token");
   lines.push("");

   // Alchemy password for secrets encryption
   if (config.secrets.length > 0) {
      lines.push("# Alchemy Secrets Encryption");
      lines.push("# Required for encrypting secrets in state file");
      lines.push("ALCHEMY_PASSWORD=your-encryption-password");
      lines.push("");
   }

   // Application secrets
   if (config.secrets.length > 0) {
      lines.push("# Application Secrets");
      lines.push("# These will be encrypted when stored in state");
      for (const secret of config.secrets) {
         lines.push(
            `${secret}=your-${secret.toLowerCase().replace(/_/g, "-")}`
         );
      }
      lines.push("");
   }

   // Plain text vars (optional, for reference)
   if (Object.keys(config.plainTextVars).length > 0) {
      lines.push("# Plain Text Variables (already in alchemy.run.ts)");
      lines.push("# These are shown here for reference only");
      for (const [key, value] of Object.entries(config.plainTextVars)) {
         lines.push(`# ${key}=${value}`);
      }
      lines.push("");
   }

   return lines.join("\n");
}
```

#### 4.5 Migration README Generator

```typescript
// src/generators/readme.ts

import type { AlchemyConfig } from "../types/alchemy";
import type { MigrationMetadata } from "../types/migration";
import type { ProjectContext } from "../utils/file-utils";

export function generateMigrationReadme(
   config: AlchemyConfig,
   metadata: MigrationMetadata,
   projectContext: ProjectContext
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
```

---

### 5. CLI Implementation

#### 5.1 CLI Entry Point

```typescript
// src/cli/index.ts

import { Command } from "commander";
import { migrateCommand } from "./commands/migrate";
import { validateCommand } from "./commands/validate";
import { previewCommand } from "./commands/preview";

const program = new Command();

program
   .name("alchemy-migrator")
   .description("Migrate Cloudflare Wrangler projects to Alchemy")
   .version("0.1.0");

program
   .command("migrate")
   .description("Migrate wrangler configuration to Alchemy")
   .argument("[config]", "Path to wrangler.toml or wrangler.json", "auto")
   .option("-o, --output <dir>", "Output directory", ".")
   .option("-s, --stage <stage>", "Stage name (e.g., prod, dev)")
   .option("--no-adopt", "Do not adopt existing resources")
   .option("--no-preserve-names", "Generate new resource names")
   .option("--env <environment>", "Target specific wrangler environment")
   .option("-i, --interactive", "Interactive mode with prompts", false)
   .option("--dry-run", "Preview changes without writing files", false)
   .action(migrateCommand);

program
   .command("validate")
   .description("Validate wrangler configuration")
   .argument("<config>", "Path to wrangler.toml or wrangler.json")
   .action(validateCommand);

program
   .command("preview")
   .description("Preview generated Alchemy configuration")
   .argument("<config>", "Path to wrangler.toml or wrangler.json")
   .option("-s, --stage <stage>", "Stage name")
   .option("--env <environment>", "Target specific wrangler environment")
   .action(previewCommand);

program.parse();
```

#### 5.2 Migrate Command

```typescript
// src/cli/commands/migrate.ts

import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import ora from "ora";
import chalk from "chalk";
import { parseWranglerConfig } from "../../parsers";
import { ConfigTransformer } from "../../transformers";
import { generateAlchemyConfig } from "../../generators/alchemy-config";
import { generateWorkerTypes } from "../../generators/types";
import { generateEnvTemplate } from "../../generators/env-file";
import { generateMigrationReadme } from "../../generators/readme";
import {
   discoverWranglerConfig,
   detectProjectContext,
} from "../../utils/file-utils";
import { promptForMigrationOptions } from "../prompts";
import type { MigrationOptions } from "../../types/migration";

export async function migrateCommand(configPath: string, options: any) {
   const spinner = ora();

   try {
      // Step 1: Discover or validate config file
      spinner.start("Discovering configuration...");

      let actualConfigPath: string;

      if (configPath === "auto") {
         const discovered = discoverWranglerConfig(process.cwd());
         if (!discovered) {
            spinner.fail("No wrangler.toml or wrangler.json found");
            console.log(
               chalk.yellow(
                  "\nPlease specify the path to your wrangler configuration file."
               )
            );
            process.exit(1);
         }
         actualConfigPath = discovered.path;
         spinner.succeed(`Found configuration: ${chalk.cyan(discovered.path)}`);
      } else {
         if (!existsSync(configPath)) {
            spinner.fail(`Configuration file not found: ${configPath}`);
            process.exit(1);
         }
         actualConfigPath = configPath;
         spinner.succeed(
            `Using configuration: ${chalk.cyan(actualConfigPath)}`
         );
      }

      // Step 2: Detect project context
      const projectContext = detectProjectContext(dirname(actualConfigPath));

      // Step 3: Interactive prompts (if enabled)
      let migrationOptions: MigrationOptions = {
         sourceFile: actualConfigPath,
         outputDir: options.output,
         stage: options.stage,
         adopt: options.adopt,
         preserveNames: options.preserveNames,
         interactive: options.interactive,
         dryRun: options.dryRun,
      };

      if (options.interactive) {
         migrationOptions = await promptForMigrationOptions(
            migrationOptions,
            projectContext
         );
      }

      // Step 4: Parse configuration
      spinner.start("Parsing configuration...");
      const parseResult = await parseWranglerConfig(actualConfigPath);
      spinner.succeed("Configuration parsed successfully");

      if (parseResult.warnings.length > 0) {
         console.log(chalk.yellow("\n⚠️  Warnings:"));
         parseResult.warnings.forEach((w) =>
            console.log(chalk.yellow(`  - ${w}`))
         );
      }

      // Step 5: Transform configuration
      spinner.start("Transforming to Alchemy format...");
      const transformer = new ConfigTransformer();
      const alchemyConfig = transformer.transform(parseResult.config, {
         appName: parseResult.config.name,
         stage: migrationOptions.stage,
         adopt: migrationOptions.adopt,
         preserveNames: migrationOptions.preserveNames,
         targetEnvironment: options.env,
      });
      spinner.succeed("Configuration transformed");

      // Step 6: Generate files
      spinner.start("Generating files...");

      const files = [
         {
            path: join(migrationOptions.outputDir, "alchemy.run.ts"),
            content: generateAlchemyConfig(alchemyConfig),
            overwrite: true,
         },
         {
            path: join(migrationOptions.outputDir, "worker-env.d.ts"),
            content: generateWorkerTypes(alchemyConfig.workers[0]),
            overwrite: true,
         },
         {
            path: join(migrationOptions.outputDir, ".env.example"),
            content: generateEnvTemplate(alchemyConfig),
            overwrite: false,
         },
         {
            path: join(migrationOptions.outputDir, "MIGRATION.md"),
            content: generateMigrationReadme(
               alchemyConfig,
               {
                  sourceFile: actualConfigPath,
                  sourceFormat: parseResult.format,
                  migratedAt: new Date().toISOString(),
                  warnings: parseResult.warnings,
                  manualSteps: [],
                  version: "0.1.0",
               },
               projectContext
            ),
            overwrite: true,
         },
      ];

      spinner.succeed("Files generated");

      // Step 7: Write files (or preview for dry-run)
      if (migrationOptions.dryRun) {
         console.log(
            chalk.blue("\n📋 Dry Run - Files that would be created:\n")
         );
         files.forEach((file) => {
            console.log(chalk.cyan(`  ${file.path}`));
            console.log(chalk.gray("  " + "-".repeat(60)));
            console.log(
               file.content
                  .split("\n")
                  .slice(0, 10)
                  .map((l) => `  ${l}`)
                  .join("\n")
            );
            console.log(chalk.gray("  ...\n"));
         });
      } else {
         spinner.start("Writing files...");

         for (const file of files) {
            if (!file.overwrite && existsSync(file.path)) {
               spinner.warn(`Skipped (already exists): ${file.path}`);
               continue;
            }

            const dir = dirname(file.path);
            if (!existsSync(dir)) {
               mkdirSync(dir, { recursive: true });
            }

            writeFileSync(file.path, file.content, "utf-8");
         }

         spinner.succeed("Files written successfully");

         // Step 8: Success message with next steps
         console.log(chalk.green("\n✅ Migration completed successfully!\n"));
         console.log(chalk.bold("Files created:"));
         files.forEach((file) => console.log(chalk.cyan(`  - ${file.path}`)));

         console.log(chalk.bold("\n📖 Next steps:"));
         console.log(
            chalk.white(
               "  1. Review the generated files, especially alchemy.run.ts"
            )
         );
         console.log(
            chalk.white("  2. Read MIGRATION.md for detailed instructions")
         );
         console.log(
            chalk.white("  3. Set up your .env file based on .env.example")
         );
         console.log(
            chalk.white(
               `  4. Install alchemy: ${projectContext.packageManager || "npm"} install alchemy`
            )
         );
         console.log(
            chalk.white(
               `  5. Deploy: ${projectContext.packageManager || "npm"} run alchemy.run.ts\n`
            )
         );
      }
   } catch (error) {
      spinner.fail("Migration failed");
      console.error(chalk.red("\n❌ Error:"), error.message);
      if (error.stack) {
         console.error(chalk.gray(error.stack));
      }
      process.exit(1);
   }
}
```

#### 5.3 Interactive Prompts

```typescript
// src/cli/prompts.ts

import prompts from "prompts";
import type { MigrationOptions } from "../types/migration";
import type { ProjectContext } from "../utils/file-utils";

export async function promptForMigrationOptions(
   initial: MigrationOptions,
   context: ProjectContext
): Promise<MigrationOptions> {
   const questions: prompts.PromptObject[] = [
      {
         type: "text",
         name: "stage",
         message: "Stage name (leave empty for default)",
         initial: initial.stage || "",
      },
      {
         type: "confirm",
         name: "adopt",
         message: "Adopt existing resources (recommended)?",
         initial: initial.adopt ?? true,
      },
      {
         type: "confirm",
         name: "preserveNames",
         message: "Preserve exact resource names from wrangler?",
         initial: initial.preserveNames ?? true,
      },
      {
         type: "text",
         name: "outputDir",
         message: "Output directory",
         initial: initial.outputDir || ".",
      },
   ];

   const answers = await prompts(questions);

   return {
      ...initial,
      ...answers,
   };
}
```

---

### 6. Validation

#### 6.1 Config Validator

```typescript
// src/validators/config-validator.ts

import type { WranglerConfig } from "../types/wrangler";

export interface ValidationResult {
   valid: boolean;
   errors: string[];
   warnings: string[];
}

export function validateConfig(config: WranglerConfig): ValidationResult {
   const errors: string[] = [];
   const warnings: string[] = [];

   // Required fields
   if (!config.name) {
      errors.push("Missing required field: name");
   }

   // Validate bindings don't conflict
   const bindingNames = new Set<string>();

   const addBinding = (name: string, type: string) => {
      if (bindingNames.has(name)) {
         errors.push(`Duplicate binding name: ${name}`);
      }
      bindingNames.add(name);
   };

   config.kv_namespaces?.forEach((kv) => addBinding(kv.binding, "KV"));
   config.r2_buckets?.forEach((r2) => addBinding(r2.binding, "R2"));
   config.d1_databases?.forEach((db) => addBinding(db.binding, "D1"));
   config.queues?.producers?.forEach((q) => addBinding(q.binding, "Queue"));

   // Warn about unsupported features
   if (config.services && config.services.length > 0) {
      warnings.push("Service bindings require manual configuration in Alchemy");
   }

   if (config.unsafe) {
      warnings.push("Unsafe bindings may require manual migration");
   }

   if (config.site) {
      warnings.push(
         "Static site configuration should use Alchemy Assets resource"
      );
   }

   if (config.tail_consumers && config.tail_consumers.length > 0) {
      warnings.push("Tail consumers require manual configuration");
   }

   return {
      valid: errors.length === 0,
      errors,
      warnings,
   };
}
```

---

### 7. Testing Strategy

#### 7.1 Test Fixtures

Create comprehensive test fixtures covering different wrangler configurations:

```typescript
// tests/fixtures/simple-worker.toml
name = "simple-worker";
main = "src/index.ts";
compatibility_date = "2024-01-01"[[kv_namespaces]];
binding = "CACHE";
id = "abc123"[vars];
API_KEY = "secret-key";
DEBUG = "true";
```

```typescript
// tests/fixtures/complex-worker.toml
name = "complex-worker";
main = "src/worker.ts";
compatibility_date = "2024-01-01";
compatibility_flags = ["nodejs_compat"][observability];
enabled = true;
head_sampling_rate = (1.0)[[kv_namespaces]];
binding = "CACHE";
id = "kv-123"[[r2_buckets]];
binding = "STORAGE";
bucket_name = "my-bucket"[[d1_databases]];
binding = "DB";
database_name = "my-database";
database_id = "db-456";
migrations_dir = "./migrations"[[queues.producers]];
binding = "TASKS";
queue = "task-queue"[[queues.consumers]];
queue = "task-queue";
max_batch_size = 10;
max_batch_timeout = (1000)[[durable_objects.bindings]];
name = "COUNTER";
class_name = "Counter"[[routes]];
pattern = "api.example.com/*";
zone_name = "example.com"[triggers];
crons = ["0 0 * * *", "*/15 * * * *"][env.production];
name = "complex-worker-prod";
```

#### 7.2 Unit Tests

```typescript
// tests/unit/parsers.test.ts

import { describe, it, expect } from "vitest";
import { parseWranglerConfig } from "../../src/parsers";

describe("Parser", () => {
   it("should parse TOML configuration", async () => {
      const result = await parseWranglerConfig(
         "./tests/fixtures/simple-worker.toml"
      );

      expect(result.format).toBe("toml");
      expect(result.config.name).toBe("simple-worker");
      expect(result.config.kv_namespaces).toHaveLength(1);
   });

   it("should parse JSON configuration", async () => {
      const result = await parseWranglerConfig(
         "./tests/fixtures/simple-worker.json"
      );

      expect(result.format).toBe("json");
      expect(result.config.name).toBe("simple-worker");
   });

   it("should normalize environment configs", async () => {
      const result = await parseWranglerConfig(
         "./tests/fixtures/complex-worker.toml"
      );

      expect(result.config.environments).toHaveProperty("production");
      expect(result.config.environments.production.name).toBe(
         "complex-worker-prod"
      );
   });
});
```

```typescript
// tests/unit/transformers.test.ts

import { describe, it, expect } from "vitest";
import { ConfigTransformer } from "../../src/transformers";

describe("Transformer", () => {
   it("should transform KV namespaces", () => {
      const transformer = new ConfigTransformer();
      const result = transformer.transform({
         name: "test",
         main: "src/index.js",
         compatibility_date: "2024-01-01",
         kv_namespaces: [{ binding: "CACHE", id: "abc" }],
         environments: {},
      });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe("KVNamespace");
      expect(result.resources[0].adopt).toBe(true);
   });

   it("should detect secrets from variable names", () => {
      const transformer = new ConfigTransformer();
      const result = transformer.transform({
         name: "test",
         main: "src/index.js",
         compatibility_date: "2024-01-01",
         vars: {
            API_KEY: "secret",
            DEBUG: "true",
         },
         environments: {},
      });

      expect(result.secrets).toContain("API_KEY");
      expect(result.secrets).not.toContain("DEBUG");
   });
});
```

#### 7.3 Integration Tests

```typescript
// tests/integration/migration.test.ts

import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { migrateCommand } from "../../src/cli/commands/migrate";

describe("End-to-end migration", () => {
   it("should migrate simple worker successfully", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "alchemy-migrator-test-"));

      try {
         await migrateCommand("./tests/fixtures/simple-worker.toml", {
            output: tmpDir,
            adopt: true,
            preserveNames: true,
            interactive: false,
            dryRun: false,
         });

         // Verify files were created
         expect(existsSync(join(tmpDir, "alchemy.run.ts"))).toBe(true);
         expect(existsSync(join(tmpDir, "worker-env.d.ts"))).toBe(true);
         expect(existsSync(join(tmpDir, ".env.example"))).toBe(true);
         expect(existsSync(join(tmpDir, "MIGRATION.md"))).toBe(true);

         // Verify content
         const alchemyConfig = readFileSync(
            join(tmpDir, "alchemy.run.ts"),
            "utf-8"
         );
         expect(alchemyConfig).toContain("KVNamespace");
         expect(alchemyConfig).toContain("adopt: true");
      } finally {
         rmSync(tmpDir, { recursive: true, force: true });
      }
   });
});
```

---

### 8. Environment Merging Strategy

```typescript
// src/normalizers/env-merger.ts

/**
 * Environment merging rules:
 * 1. Env overrides base for scalar values
 * 2. Arrays replace by default (routes, bindings)
 * 3. Objects shallow merge (observability, placement)
 * 4. Explicit null in env removes base value
 */

export interface EnvMergeOptions {
   baseConfig: WranglerConfig;
   envName: string;
   envConfig: Partial<WranglerConfig>;
   stage: string;
}

export function mergeEnvironment(options: EnvMergeOptions): WranglerConfig {
   const { baseConfig, envConfig } = options;

   // Start with base
   const merged: WranglerConfig = { ...baseConfig };

   // Scalar overrides
   if (envConfig.name !== undefined) merged.name = envConfig.name;
   if (envConfig.main !== undefined) merged.main = envConfig.main;
   if (envConfig.compatibility_date !== undefined)
      merged.compatibility_date = envConfig.compatibility_date;

   // Array replacements (env replaces base entirely)
   if (envConfig.routes !== undefined) merged.routes = envConfig.routes;
   if (envConfig.kv_namespaces !== undefined)
      merged.kv_namespaces = envConfig.kv_namespaces;
   if (envConfig.r2_buckets !== undefined)
      merged.r2_buckets = envConfig.r2_buckets;
   if (envConfig.d1_databases !== undefined)
      merged.d1_databases = envConfig.d1_databases;

   // Object merges
   if (envConfig.observability !== undefined) {
      merged.observability = {
         ...merged.observability,
         ...envConfig.observability,
      };
   }

   // Vars merge (env extends/overrides base)
   if (envConfig.vars !== undefined) {
      merged.vars = { ...merged.vars, ...envConfig.vars };
   }

   return merged;
}

/**
 * Resolve preview vs production IDs based on stage
 */
export function resolveResourceIds(
   config: WranglerConfig,
   stage: string
): WranglerConfig {
   const isProd = stage === "prod" || stage === "production";

   // KV namespaces
   if (config.kv_namespaces) {
      config.kv_namespaces = config.kv_namespaces.map((kv) => {
         if (!isProd && kv.preview_id) {
            return { ...kv, id: kv.preview_id };
         }
         return kv;
      });
   }

   // Similar for D1, R2, etc.

   return config;
}
```

### 9. Deterministic Output

```typescript
// src/utils/sorting.ts

/**
 * Ensure all output is deterministic and reproducible
 */

export function sortObject<T extends Record<string, any>>(obj: T): T {
   const sorted: any = {};
   Object.keys(obj)
      .sort()
      .forEach((key) => {
         sorted[key] = obj[key];
      });
   return sorted;
}

export function sortResources(resources: IRResource[]): IRResource[] {
   return [...resources].sort((a, b) => {
      // Sort by type first, then by variable name
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.variableName.localeCompare(b.variableName);
   });
}

/**
 * Format generated code with Prettier
 */
// src/generators/formatter.ts

import prettier from "prettier";

export async function formatTypeScript(code: string): Promise<string> {
   return prettier.format(code, {
      parser: "typescript",
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 100,
      tabWidth: 2,
      endOfLine: "lf", // Cross-platform consistency
   });
}
```

### 10. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)

- [ ] Set up project structure with proper TypeScript config
- [ ] Implement Zod schemas for complete Wrangler config
- [ ] Build TOML parser with validation
- [ ] Build JSON parser with validation
- [ ] Create IR types and ResourceRegistry
- [ ] Implement config validator with comprehensive error messages

#### Phase 2: Normalization & IR (Week 2)

- [ ] Implement environment merging logic
- [ ] Implement stage resolver (preview vs prod IDs)
- [ ] Build IR builder from normalized config
- [ ] Implement ResourceRegistry with stable keys
- [ ] Add IR validator for cross-references
- [ ] Add support for all resource types in IR

#### Phase 3: Transformation Logic (Week 3)

- [ ] Implement ResourceMapper (Config → IR)
- [ ] Implement BindingTransformer with all binding types
- [ ] Build main ConfigTransformer
- [ ] Handle Durable Object migrations (warn, don't transform)
- [ ] Handle service bindings (preserve with warnings)
- [ ] Fix queue consumer max_concurrency mapping

#### Phase 4: Code Generation (Week 4)

- [ ] Build TypeScript AST utilities
- [ ] Implement Alchemy config generator from IR
- [ ] Implement types generator
- [ ] Implement env file generator
- [ ] Implement README generator with warnings/manual steps
- [ ] Add Prettier formatting
- [ ] Add deterministic sorting

#### Phase 5: CLI & UX (Week 5)

- [ ] Build CLI with Commander (all flags)
- [ ] Add interactive prompts
- [ ] Implement auto-discovery
- [ ] Add --preview/--diff command
- [ ] Add migration summary display
- [ ] Add spinner/progress indicators
- [ ] Create beautiful terminal output with colors

#### Phase 6: Testing & Validation (Week 6)

- [ ] Write unit tests for parsers
- [ ] Write unit tests for env merging
- [ ] Write unit tests for transformers
- [ ] Create golden snapshot tests
- [ ] Add tsc compile validation for generated code
- [ ] Add Prettier format check
- [ ] Cross-platform path tests
- [ ] Property-based tests for env merging

#### Phase 7: Documentation & Release (Week 7)

- [ ] Write comprehensive README
- [ ] Add examples for common scenarios
- [ ] Create migration guide
- [ ] Document all CLI flags
- [ ] Set up CI/CD with tests
- [ ] Publish to npm

---

### 9. Edge Cases & Advanced Features

#### 9.1 Service Bindings

```typescript
// Requires manual configuration
// Add to manual steps in migration output
if (config.services) {
   metadata.manualSteps.push(
      "Service bindings require manual configuration. See https://alchemy.run/docs/service-bindings"
   );
}
```

#### 9.2 Multiple Workers

```typescript
// Future enhancement: support multiple workers in single config
// For now, focus on single worker migration
```

#### 9.3 Monorepo Support

```typescript
// Detect monorepo structure (pnpm-workspace.yaml, lerna.json, etc.)
// Offer to migrate all workers at once
```

#### 9.4 Custom State Store

```typescript
// Generate CloudflareStateStore configuration for CI/CD
const stateStoreConfig = `
import { CloudflareStateStore } from 'alchemy/cloudflare/state';

const app = await alchemy("${appName}", {
  stateStore: (scope) => new CloudflareStateStore(scope, {
    bucketName: "alchemy-state",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  })
});
`;
```

---

### 10. Package Configuration

#### package.json

```json
{
   "name": "alchemy-migrator",
   "version": "0.1.0",
   "description": "Migrate Cloudflare Wrangler projects to Alchemy",
   "type": "module",
   "bin": {
      "alchemy-migrator": "./dist/cli/index.js"
   },
   "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "test": "vitest",
      "test:coverage": "vitest --coverage"
   },
   "dependencies": {
      "commander": "^12.0.0",
      "prompts": "^2.4.2",
      "ora": "^8.0.1",
      "chalk": "^5.3.0",
      "@iarna/toml": "^2.2.5",
      "zod": "^3.22.4",
      "prettier": "^3.1.0"
   },
   "devDependencies": {
      "@types/node": "^20.0.0",
      "@types/prompts": "^2.4.9",
      "typescript": "^5.3.0",
      "vitest": "^1.0.0",
      "@vitest/coverage-v8": "^1.0.0",
      "alchemy": "latest",
      "fast-check": "^3.15.0"
   },
   "keywords": [
      "alchemy",
      "cloudflare",
      "wrangler",
      "migration",
      "infrastructure-as-code",
      "workers"
   ]
}
```

#### tsconfig.json

```json
{
   "compilerOptions": {
      "target": "ES2022",
      "module": "ES2022",
      "moduleResolution": "bundler",
      "lib": ["ES2022"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
   },
   "include": ["src/**/*"],
   "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Summary

This plan provides a complete blueprint for building the wrangler-to-alchemy migration tool. The implementation is broken down into:

1. **Clear architecture** with separation of concerns (parsers → normalizers → IR → generators)
2. **Type-safe design** using Zod for runtime validation and TypeScript for compile-time safety
3. **Comprehensive coverage** of all wrangler features including new additions:
   - Durable Object migrations
   - Assets/site configuration
   - Placement, usage_model, node_compat
   - Dispatch namespaces, tail consumers
   - Queue consumer max_concurrency (critical fix)
4. **Intermediate Representation** layer for stable transformations
5. **Deterministic output** with Prettier formatting and alphabetical sorting
6. **Excellent UX** with:
   - Interactive prompts
   - Migration preview/diff
   - Progress indicators
   - Comprehensive warnings and manual steps
7. **Safety-first** approach using resource adoption
8. **Thorough testing** strategy:
   - Unit tests with Zod validation
   - Golden snapshot tests
   - TypeScript compilation validation
   - Property-based tests for env merging
   - Cross-platform compatibility
9. **Phased implementation** plan for systematic development (7 weeks)

### Key Improvements from Oracle Review

**Architecture:**

- ✅ Added explicit Intermediate Representation (IR) layer
- ✅ Centralized Resource Registry with stable keys
- ✅ Separated normalization (env merging) from transformation

**Schema Coverage:**

- ✅ Switched to Zod for runtime validation
- ✅ Added missing fields: durable_objects.migrations, assets, placement, usage_model, node_compat, minify, no_bundle, tsconfig, rules, dispatch_namespaces, tail_consumers
- ✅ Fixed queue consumer max_concurrency mapping
- ✅ Added support for both routes array and singular route field

**Output Quality:**

- ✅ Deterministic sorting of resources and bindings
- ✅ Prettier formatting for consistent code style
- ✅ LF line endings for cross-platform consistency
- ✅ TypeScript compilation validation in tests

**UX Enhancements:**

- ✅ Added --preview/--diff command
- ✅ Migration summary before writing files
- ✅ --strict mode for unknown fields
- ✅ Comprehensive warnings with remediation links

**Testing:**

- ✅ Golden snapshot tests for fixtures
- ✅ tsc compile validation for generated code
- ✅ Property-based tests for env merging (fast-check)
- ✅ Cross-platform path tests

### Next Steps

The tool can now be developed incrementally following the 7-phase plan:

1. **Week 1**: Core infrastructure with Zod schemas
2. **Week 2**: Normalization & IR layer
3. **Week 3**: Transformation logic
4. **Week 4**: Code generation with formatting
5. **Week 5**: CLI & UX polish
6. **Week 6**: Comprehensive testing
7. **Week 7**: Documentation & release

Each phase builds on the previous one, ensuring a solid foundation before adding complexity.
