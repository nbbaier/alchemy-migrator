import { readFileSync } from 'fs';
import { parse as parseToml } from '@iarna/toml';
import { WranglerConfigSchema, type WranglerConfig, type NormalizedWranglerConfig } from './schema.js';

export type ConfigFormat = 'toml' | 'json';

export interface ParserResult {
  config: NormalizedWranglerConfig;
  format: ConfigFormat;
  warnings: string[];
}

/**
 * Detects and parses wrangler configuration file
 */
export async function parseWranglerConfig(filePath: string): Promise<ParserResult> {
  const format = detectFormat(filePath);
  const content = readFileSync(filePath, 'utf-8');

  let rawConfig: unknown;

  if (format === 'toml') {
    rawConfig = parseToml(content);
  } else {
    rawConfig = JSON.parse(content);
  }

  // Validate configuration with Zod
  const parseResult = WranglerConfigSchema.safeParse(rawConfig);

  if (!parseResult.success) {
    throw new Error(`Invalid wrangler configuration: ${parseResult.error.message}`);
  }

  const validConfig = parseResult.data;

  // Normalize configuration
  const normalized = normalizeConfig(validConfig, format);

  return {
    config: normalized,
    format,
    warnings: []
  };
}

function detectFormat(filePath: string): ConfigFormat {
  if (filePath.endsWith('.toml')) return 'toml';
  if (filePath.endsWith('.json')) return 'json';
  throw new Error('Unsupported config format. Must be .toml or .json');
}

/**
 * Normalizes configuration by:
 * - Extracting environment-specific configs
 * - Setting defaults
 * - Resolving inheritance
 */
function normalizeConfig(config: WranglerConfig, format: ConfigFormat): NormalizedWranglerConfig {
  const baseConfig: WranglerConfig = { ...config };
  delete baseConfig.env;

  const environments: Record<string, WranglerConfig> = {};

  // Extract and merge environment configs
  if (config.env) {
    for (const [envName, envConfig] of Object.entries(config.env)) {
      environments[envName] = mergeConfigs(baseConfig, envConfig as Partial<WranglerConfig>);
    }
  }

  // Check for preview IDs
  const hasPreviewIds = !!(
    config.kv_namespaces?.some((kv: any) => kv.preview_id) ||
    config.d1_databases?.some((db: any) => db.preview_database_id) ||
    config.r2_buckets?.some((r2: any) => r2.preview_bucket_name)
  );

  // Ensure required fields have defaults
  const normalized: NormalizedWranglerConfig = {
    ...baseConfig,
    name: config.name || 'unnamed-worker',
    main: config.main || 'src/index.js',
    compatibility_date: config.compatibility_date || new Date().toISOString().split('T')[0],
    environments,
    _meta: {
      sourceFormat: format,
      hasPreviewIds,
    }
  };

  return normalized;
}

function mergeConfigs(base: WranglerConfig, override: Partial<WranglerConfig>): WranglerConfig {
  return {
    ...base,
    ...override,
    // Deep merge arrays
    kv_namespaces: override.kv_namespaces || base.kv_namespaces,
    r2_buckets: override.r2_buckets || base.r2_buckets,
    d1_databases: override.d1_databases || base.d1_databases,
    // Merge objects
    vars: { ...base.vars, ...override.vars },
  };
}
