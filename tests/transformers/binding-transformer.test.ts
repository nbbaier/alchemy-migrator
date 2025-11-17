import { describe, expect, it } from "vitest";
import { BindingTransformer } from "../../src/transformers/binding-transformer.js";

describe("BindingTransformer", () => {
	describe("transformBindings", () => {
		it("should transform KV namespace bindings", () => {
			const config = {
				kv_namespaces: [
					{ binding: "CACHE", id: "abc123" },
					{ binding: "SESSION", id: "def456" },
				],
			};

			const context = {
				resources: new Map([
					["kv:cache", "cache"],
					["kv:session", "session"],
				]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.CACHE).toEqual({
				type: "resource",
				resourceRef: "cache",
			});
			expect(bindings.SESSION).toEqual({
				type: "resource",
				resourceRef: "session",
			});
		});

		it("should transform R2 bucket bindings", () => {
			const config = {
				r2_buckets: [{ binding: "UPLOADS", bucket_name: "my-uploads" }],
			};

			const context = {
				resources: new Map([["r2:uploads", "uploads"]]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.UPLOADS).toEqual({
				type: "resource",
				resourceRef: "uploads",
			});
		});

		it("should transform D1 database bindings", () => {
			const config = {
				d1_databases: [
					{ binding: "DB", database_name: "my-db", database_id: "db123" },
				],
			};

			const context = {
				resources: new Map([["d1:db", "db"]]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.DB).toEqual({
				type: "resource",
				resourceRef: "db",
			});
		});

		it("should transform queue producer bindings", () => {
			const config = {
				queues: {
					producers: [{ binding: "TASKS", queue: "task-queue" }],
				},
			};

			const context = {
				resources: new Map([["queue:tasks", "tasks"]]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.TASKS).toEqual({
				type: "resource",
				resourceRef: "tasks",
			});
		});

		it("should transform durable object bindings", () => {
			const config = {
				durable_objects: {
					bindings: [
						{ name: "COUNTER", class_name: "Counter" },
						{ name: "ROOM", class_name: "ChatRoom" },
					],
				},
			};

			const context = {
				resources: new Map([
					["durableobject:counter", "counter"],
					["durableobject:room", "room"],
				]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.COUNTER).toEqual({
				type: "resource",
				resourceRef: "counter",
			});
			expect(bindings.ROOM).toEqual({
				type: "resource",
				resourceRef: "room",
			});
		});

		it("should detect secrets based on variable name patterns", () => {
			const config = {
				vars: {
					API_KEY: "should-be-secret",
					SECRET_TOKEN: "also-secret",
					AUTH_PASSWORD: "secret-too",
					PRIVATE_KEY: "very-secret",
					REGULAR_VAR: "not-secret",
				},
			};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.API_KEY).toEqual({
				type: "secret",
				secretName: "API_KEY",
			});
			expect(bindings.SECRET_TOKEN).toEqual({
				type: "secret",
				secretName: "SECRET_TOKEN",
			});
			expect(bindings.AUTH_PASSWORD).toEqual({
				type: "secret",
				secretName: "AUTH_PASSWORD",
			});
			expect(bindings.PRIVATE_KEY).toEqual({
				type: "secret",
				secretName: "PRIVATE_KEY",
			});
			expect(bindings.REGULAR_VAR).toEqual({
				type: "plainText",
				value: "not-secret",
			});

			expect(context.secrets.has("API_KEY")).toBe(true);
			expect(context.secrets.has("SECRET_TOKEN")).toBe(true);
			expect(context.secrets.has("REGULAR_VAR")).toBe(false);
		});

		it("should handle string environment variables", () => {
			const config = {
				vars: {
					API_URL: "https://api.example.com",
					DEBUG: "true",
				},
			};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.API_URL).toEqual({
				type: "plainText",
				value: "https://api.example.com",
			});
			expect(bindings.DEBUG).toEqual({
				type: "plainText",
				value: "true",
			});
		});

		it("should handle JSON environment variables", () => {
			const config = {
				vars: {
					MAX_RETRIES: 5,
					ENABLE_FEATURE: true,
					CONFIG: { foo: "bar" },
				},
			};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.MAX_RETRIES).toEqual({
				type: "json",
				value: 5,
			});
			expect(bindings.ENABLE_FEATURE).toEqual({
				type: "json",
				value: true,
			});
			expect(bindings.CONFIG).toEqual({
				type: "json",
				value: { foo: "bar" },
			});
		});

		it("should skip bindings without resource mappings", () => {
			const config = {
				kv_namespaces: [{ binding: "CACHE", id: "abc123" }],
			};

			const context = {
				resources: new Map(), // Empty - no mappings
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings.CACHE).toBeUndefined();
		});

		it("should handle config with no bindings", () => {
			const config = {};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(Object.keys(bindings)).toHaveLength(0);
		});

		it("should sanitize IDs correctly", () => {
			const config = {
				kv_namespaces: [{ binding: "MY-CACHE-STORE", id: "abc123" }],
			};

			const context = {
				resources: new Map([["kv:my_cache_store", "myCache"]]),
				secrets: new Set<string>(),
			};

			const bindings = BindingTransformer.transformBindings(config, context);

			expect(bindings["MY-CACHE-STORE"]).toEqual({
				type: "resource",
				resourceRef: "myCache",
			});
		});
	});

	describe("secret detection patterns", () => {
		it("should detect various secret patterns", () => {
			const secretKeys = [
				"API_KEY",
				"api_key",
				"apiKey",
				"SECRET",
				"my_secret",
				"PASSWORD",
				"user_password",
				"TOKEN",
				"auth_token",
				"PRIVATE_KEY",
				"privateKey",
				"AUTH_HEADER",
				"authentication",
				"CREDENTIALS",
				"db_credential",
			];

			const config = {
				vars: Object.fromEntries(secretKeys.map((k) => [k, "value"])),
			};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			BindingTransformer.transformBindings(config, context);

			// All should be detected as secrets
			secretKeys.forEach((key) => {
				expect(context.secrets.has(key)).toBe(true);
			});
		});

		it("should not flag non-secret variables", () => {
			const normalKeys = [
				"API_URL",
				"BASE_URL",
				"ENVIRONMENT",
				"REGION",
				"MAX_RETRIES",
			];

			const config = {
				vars: Object.fromEntries(normalKeys.map((k) => [k, "value"])),
			};

			const context = {
				resources: new Map(),
				secrets: new Set<string>(),
			};

			BindingTransformer.transformBindings(config, context);

			// None should be secrets
			normalKeys.forEach((key) => {
				expect(context.secrets.has(key)).toBe(false);
			});
		});
	});
});
