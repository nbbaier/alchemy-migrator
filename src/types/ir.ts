/**
 * Intermediate Representation - stable layer between parsing and generation
 *
 * Purpose:
 * - Decouple input format (wrangler) from output format (alchemy)
 * - Provide stable resource keys for references
 * - Enable validation and transformation without coupling to either format
 */

export type ResourceKey = `${ResourceType}:${string}`;
export type ResourceType = 'kv' | 'r2' | 'd1' | 'queue' | 'do' | 'service' | 'hyperdrive' | 'vectorize' | 'ai' | 'browser' | 'analytics' | 'dispatch';

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
  | { type: 'resource'; key: ResourceKey }
  | { type: 'secret'; name: string; envVar: string }
  | { type: 'text'; value: string }
  | { type: 'json'; value: unknown }
  | { type: 'service'; service: string; environment?: string };

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
    mode: 'smart';
  };

  // Other worker config
  usage_model?: 'bundled' | 'unbound';
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
    sourceFormat: 'toml' | 'json';
    sourceFile: string;
    migratedAt: string;
    version: string;
  };
}
