import { describe, it, expect } from 'vitest';
import { ResourceMapper } from '../../src/transformers/resource-mapper.js';

describe('ResourceMapper', () => {
  describe('mapKVNamespaces', () => {
    it('should map KV namespaces with adopt', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const kvNamespaces = [
        { binding: 'CACHE', id: 'abc123' },
        { binding: 'SESSION_STORE', id: 'def456' },
      ];

      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('KVNamespace');
      expect(result[0].id).toBe('cache');
      expect(result[0].variableName).toBe('cache');
      expect(result[0].adopt).toBe(true);
      expect(result[0].props.title).toBe('CACHE');
      expect(result[0].props.adopt).toBe(true);
    });

    it('should generate names when preserveNames is false', () => {
      const mapper = new ResourceMapper({
        adopt: false,
        preserveNames: false,
        appName: 'my-app',
        stage: 'prod',
      });

      const kvNamespaces = [{ binding: 'CACHE', id: 'abc123' }];
      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result[0].props.title).toBe('my-app-cache-prod');
    });

    it('should return empty array for undefined input', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      expect(mapper.mapKVNamespaces(undefined)).toEqual([]);
      expect(mapper.mapKVNamespaces([])).toEqual([]);
    });
  });

  describe('mapR2Buckets', () => {
    it('should map R2 buckets with jurisdiction', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const buckets = [
        { binding: 'UPLOADS', bucket_name: 'my-uploads', jurisdiction: 'eu' },
      ];

      const result = mapper.mapR2Buckets(buckets);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('R2Bucket');
      expect(result[0].id).toBe('uploads');
      expect(result[0].variableName).toBe('uploads');
      expect(result[0].props.name).toBe('my-uploads');
      expect(result[0].props.jurisdiction).toBe('eu');
    });

    it('should generate bucket names when preserveNames is false', () => {
      const mapper = new ResourceMapper({
        adopt: false,
        preserveNames: false,
        appName: 'my-app',
      });

      const buckets = [{ binding: 'UPLOADS', bucket_name: 'old-bucket' }];
      const result = mapper.mapR2Buckets(buckets);

      expect(result[0].props.name).toBe('my-app-uploads');
    });
  });

  describe('mapD1Databases', () => {
    it('should map D1 databases with migrations', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const databases = [
        {
          binding: 'DB',
          database_name: 'my-db',
          database_id: 'db123',
          migrations_dir: './migrations',
        },
      ];

      const result = mapper.mapD1Databases(databases);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('D1Database');
      expect(result[0].id).toBe('db');
      expect(result[0].variableName).toBe('db');
      expect(result[0].props.name).toBe('my-db');
      expect(result[0].props.migrationsDir).toBe('./migrations');
    });

    it('should omit migrations_dir when not provided', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const databases = [{ binding: 'DB', database_name: 'my-db' }];
      const result = mapper.mapD1Databases(databases);

      expect(result[0].props.migrationsDir).toBeUndefined();
    });
  });

  describe('mapQueues', () => {
    it('should map queue producers', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const queues = {
        producers: [
          { binding: 'TASKS', queue: 'task-queue' },
          { binding: 'NOTIFICATIONS', queue: 'notification-queue' },
        ],
      };

      const result = mapper.mapQueues(queues);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('Queue');
      expect(result[0].id).toBe('tasks');
      expect(result[0].variableName).toBe('tasks');
      expect(result[0].props.name).toBe('task-queue');
    });

    it('should return empty array when no producers', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      expect(mapper.mapQueues(undefined)).toEqual([]);
      expect(mapper.mapQueues({ producers: [] })).toEqual([]);
    });
  });

  describe('mapDurableObjects', () => {
    it('should map durable object namespaces', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const durableObjects = {
        bindings: [
          { name: 'COUNTER', class_name: 'Counter' },
          { name: 'ROOM', class_name: 'ChatRoom', script_name: 'chat-worker' },
        ],
      };

      const result = mapper.mapDurableObjects(durableObjects);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('DurableObjectNamespace');
      expect(result[0].id).toBe('counter');
      expect(result[0].variableName).toBe('counter');
      expect(result[0].adopt).toBe(false); // DOs never adopted
      expect(result[0].props.className).toBe('Counter');

      expect(result[1].props.className).toBe('ChatRoom');
      expect(result[1].props.scriptName).toBe('chat-worker');
    });
  });

  describe('variable name generation', () => {
    it('should use meaningful IDs for variable names', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const kvNamespaces = [
        { binding: 'CACHE', id: 'abc' },
        { binding: 'SESSION', id: 'def' },
      ];

      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result[0].variableName).toBe('cache');
      expect(result[1].variableName).toBe('session');
    });

    it('should use index for generic bindings', () => {
      const mapper = new ResourceMapper({
        adopt: true,
        preserveNames: true,
        appName: 'test-app',
      });

      const kvNamespaces = [
        { binding: 'BINDING', id: 'abc' },
        { binding: 'KV', id: 'def' },
      ];

      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result[0].variableName).toBe('kv');
      expect(result[1].variableName).toBe('kv2');
    });
  });

  describe('resource name generation with stage', () => {
    it('should include stage in generated names', () => {
      const mapper = new ResourceMapper({
        adopt: false,
        preserveNames: false,
        appName: 'my-app',
        stage: 'staging',
      });

      const kvNamespaces = [{ binding: 'CACHE', id: 'abc' }];
      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result[0].props.title).toBe('my-app-cache-staging');
    });

    it('should not include stage when not provided', () => {
      const mapper = new ResourceMapper({
        adopt: false,
        preserveNames: false,
        appName: 'my-app',
      });

      const kvNamespaces = [{ binding: 'CACHE', id: 'abc' }];
      const result = mapper.mapKVNamespaces(kvNamespaces);

      expect(result[0].props.title).toBe('my-app-cache');
    });
  });
});
