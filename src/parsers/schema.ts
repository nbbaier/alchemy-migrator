import { z } from 'zod';

/**
 * Complete Zod schema for wrangler.toml/json
 * Used for runtime validation during parsing
 */

// Basic worker configuration
// Use type assertion to avoid circular reference issues
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
  }).optional(),

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
  }).optional(),

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
  })).optional(),

  // Environment Variables
  vars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),

  // Text Blobs
  text_blobs: z.record(z.string()).optional(),

  // Data Blobs
  data_blobs: z.record(z.string()).optional(),

  // WASM Modules
  wasm_modules: z.record(z.string()).optional(),

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
  workers_dot_dev: z.boolean().optional(),

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
  }).optional(),

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
