import { describe, expect, it } from "vitest";
import type { NormalizedWranglerConfig } from "../../src/parsers/schema.js";
import { ConfigTransformer } from "../../src/transformers/index.js";

describe("ConfigTransformer", () => {
	const createBaseConfig = (): NormalizedWranglerConfig => ({
		name: "test-worker",
		main: "src/index.js",
		compatibility_date: "2024-01-01",
		environments: {},
		_meta: {
			sourceFormat: "toml",
			hasPreviewIds: false,
		},
	});

	describe("transform", () => {
		it("should transform basic worker config", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();

			const result = transformer.transform(config);

			expect(result.appName).toBe("test-worker");
			expect(result.workers).toHaveLength(1);
			expect(result.workers[0].id).toBe("worker");
			expect(result.workers[0].props.name).toBe("test-worker");
			expect(result.workers[0].props.entrypoint).toBe("src/index.js");
			expect(result.workers[0].props.compatibilityDate).toBe("2024-01-01");
		});

		it("should use custom appName and stage", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();

			const result = transformer.transform(config, {
				appName: "my-app",
				stage: "prod",
				preserveNames: false,
			});

			expect(result.appName).toBe("my-app");
			expect(result.stage).toBe("prod");
			expect(result.workers[0].props.name).toBe("my-app-prod");
		});

		it("should preserve worker name when preserveNames is true", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();

			const result = transformer.transform(config, {
				appName: "my-app",
				stage: "prod",
				preserveNames: true,
			});

			expect(result.workers[0].props.name).toBe("test-worker");
		});

		it("should transform KV resources and bindings", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.kv_namespaces = [{ binding: "CACHE", id: "abc123" }];

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(1);
			expect(result.resources[0].type).toBe("KVNamespace");
			expect(result.resources[0].id).toBe("cache");

			expect(result.workers[0].bindings.CACHE).toEqual({
				type: "resource",
				resourceRef: "cache",
			});
		});

		it("should transform R2 resources and bindings", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.r2_buckets = [{ binding: "UPLOADS", bucket_name: "my-uploads" }];

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(1);
			expect(result.resources[0].type).toBe("R2Bucket");
			expect(result.resources[0].props.name).toBe("my-uploads");

			expect(result.workers[0].bindings.UPLOADS).toBeDefined();
		});

		it("should transform D1 resources and bindings", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.d1_databases = [
				{ binding: "DB", database_name: "my-db", database_id: "db123" },
			];

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(1);
			expect(result.resources[0].type).toBe("D1Database");
			expect(result.workers[0].bindings.DB).toBeDefined();
		});

		it("should transform queue resources and bindings", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.queues = {
				producers: [{ binding: "TASKS", queue: "task-queue" }],
			};

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(1);
			expect(result.resources[0].type).toBe("Queue");
			expect(result.workers[0].bindings.TASKS).toBeDefined();
		});

		it("should transform durable object namespaces", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.durable_objects = {
				bindings: [{ name: "COUNTER", class_name: "Counter" }],
			};

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(1);
			expect(result.resources[0].type).toBe("DurableObjectNamespace");
			expect(result.resources[0].props.className).toBe("Counter");
		});

		it("should extract secrets from vars", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.vars = {
				API_KEY: "secret-value",
				API_URL: "https://api.example.com",
			};

			const result = transformer.transform(config);

			expect(result.secrets).toContain("API_KEY");
			expect(result.secrets).not.toContain("API_URL");
			expect(result.plainTextVars.API_URL).toBe("https://api.example.com");
		});

		it("should transform routes", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.routes = [
				"example.com/*",
				{ pattern: "api.example.com/*", zone_id: "zone123" },
			];

			const result = transformer.transform(config);

			expect(result.workers[0].routes).toHaveLength(2);
			expect(result.workers[0].routes?.[0]).toEqual({
				pattern: "example.com/*",
			});
			expect(result.workers[0].routes?.[1]).toEqual({
				pattern: "api.example.com/*",
				zoneId: "zone123",
				zoneName: undefined,
			});
		});

		it("should transform cron triggers", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.triggers = {
				crons: ["0 0 * * *", "0 12 * * *"],
			};

			const result = transformer.transform(config);

			expect(result.workers[0].crons).toEqual(["0 0 * * *", "0 12 * * *"]);
		});

		it("should transform queue consumers", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.queues = {
				producers: [{ binding: "TASKS", queue: "task-queue" }],
				consumers: [
					{
						queue: "task-queue",
						max_batch_size: 10,
						max_batch_timeout: 30,
						max_retries: 3,
						max_concurrency: 5,
					},
				],
			};

			const result = transformer.transform(config);

			expect(result.workers[0].eventSources).toHaveLength(1);
			expect(result.workers[0].eventSources?.[0].settings).toEqual({
				batchSize: 10,
				maxWaitTimeMs: 30,
				maxRetries: 3,
				maxConcurrency: 5,
				deadLetterQueue: undefined,
			});
		});

		it("should handle compatibility flags", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.compatibility_flags = [
				"nodejs_compat",
				"streams_enable_constructors",
			];

			const result = transformer.transform(config);

			expect(result.workers[0].props.compatibilityFlags).toEqual([
				"nodejs_compat",
				"streams_enable_constructors",
			]);
		});

		it("should handle observability settings", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.observability = {
				enabled: true,
				head_sampling_rate: 0.5,
			};

			const result = transformer.transform(config);

			expect(result.workers[0].props.observability).toEqual({
				enabled: true,
				head_sampling_rate: 0.5,
			});
		});

		it("should use specific environment when targetEnvironment is set", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.kv_namespaces = [{ binding: "CACHE", id: "base-kv" }];
			config.environments = {
				production: {
					name: "prod-worker",
					kv_namespaces: [{ binding: "CACHE", id: "prod-kv" }],
				},
			};

			const result = transformer.transform(config, {
				targetEnvironment: "production",
			});

			// Should use production environment's KV
			expect(result.resources[0].id).toBe("cache");
		});

		it("should disable resource adoption when adopt is false", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.kv_namespaces = [{ binding: "CACHE", id: "abc123" }];

			const result = transformer.transform(config, { adopt: false });

			expect(result.resources[0].adopt).toBe(false);
			expect(result.resources[0].props.adopt).toBe(false);
		});

		it("should handle multiple resource types together", () => {
			const transformer = new ConfigTransformer();
			const config = createBaseConfig();
			config.kv_namespaces = [{ binding: "CACHE", id: "kv1" }];
			config.r2_buckets = [{ binding: "UPLOADS", bucket_name: "uploads" }];
			config.d1_databases = [{ binding: "DB", database_name: "db" }];
			config.queues = {
				producers: [{ binding: "TASKS", queue: "tasks" }],
			};

			const result = transformer.transform(config);

			expect(result.resources).toHaveLength(4);
			expect(result.resources.map((r) => r.type)).toEqual([
				"KVNamespace",
				"R2Bucket",
				"D1Database",
				"Queue",
			]);
		});
	});
});
