import type { WranglerConfig } from '../parsers/schema.js';
import type { AlchemyBinding } from '../types/alchemy.js';

export interface BindingContext {
  resources: Map<string, string>; // binding name -> variable name
  secrets: Set<string>;
}

/**
 * Transforms wrangler bindings to Alchemy bindings
 */
export class BindingTransformer {
  /**
   * Sanitize ID to match resource mapper format
   */
  private static sanitizeId(id: string): string {
    return id.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  }

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
        const id = this.sanitizeId(kv.binding);
        const resourceVar = context.resources.get(`kv:${id}`);
        if (resourceVar) {
          bindings[kv.binding] = {
            type: 'resource',
            resourceRef: resourceVar
          };
        }
      }
    }

    // R2 Buckets
    if (config.r2_buckets) {
      for (const bucket of config.r2_buckets) {
        const id = this.sanitizeId(bucket.binding);
        const resourceVar = context.resources.get(`r2:${id}`);
        if (resourceVar) {
          bindings[bucket.binding] = {
            type: 'resource',
            resourceRef: resourceVar
          };
        }
      }
    }

    // D1 Databases
    if (config.d1_databases) {
      for (const db of config.d1_databases) {
        const id = this.sanitizeId(db.binding);
        const resourceVar = context.resources.get(`d1:${id}`);
        if (resourceVar) {
          bindings[db.binding] = {
            type: 'resource',
            resourceRef: resourceVar
          };
        }
      }
    }

    // Queue Producers
    if (config.queues?.producers) {
      for (const queue of config.queues.producers) {
        const id = this.sanitizeId(queue.binding);
        const resourceVar = context.resources.get(`queue:${id}`);
        if (resourceVar) {
          bindings[queue.binding] = {
            type: 'resource',
            resourceRef: resourceVar
          };
        }
      }
    }

    // Durable Objects
    if (config.durable_objects?.bindings) {
      for (const do_ of config.durable_objects.bindings) {
        const id = this.sanitizeId(do_.name);
        const resourceVar = context.resources.get(`durableobject:${id}`);
        if (resourceVar) {
          bindings[do_.name] = {
            type: 'resource',
            resourceRef: resourceVar
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
            type: 'secret',
            secretName: key
          };
          context.secrets.add(key);
        } else if (typeof value === 'string') {
          bindings[key] = {
            type: 'plainText',
            value: value
          };
        } else {
          // Numbers, booleans, or objects become JSON bindings
          bindings[key] = {
            type: 'json',
            value: value
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

    return secretPatterns.some(pattern => pattern.test(key));
  }
}
