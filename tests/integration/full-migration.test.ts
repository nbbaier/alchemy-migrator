import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWranglerConfig } from "../../src/parsers/index.js";
import { ConfigTransformer } from "../../src/transformers/index.js";

describe("Full Migration Integration", () => {
	it("should migrate complex worker config", async () => {
		const parsed = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/complex-worker.toml"),
		);
		const transformer = new ConfigTransformer();
		const result = transformer.transform(parsed.config);

		// Worker config
		expect(result.appName).toBe("my-worker");
		expect(result.workers).toHaveLength(1);
		expect(result.workers[0].props.name).toBe("my-worker");
		expect(result.workers[0].props.compatibilityFlags).toContain(
			"nodejs_compat",
		);

		// Resources
		expect(result.resources).toHaveLength(6); // 2 KV + 1 R2 + 1 D1 + 1 Queue + 1 DO
		expect(
			result.resources.filter((r) => r.type === "KVNamespace"),
		).toHaveLength(2);
		expect(result.resources.filter((r) => r.type === "R2Bucket")).toHaveLength(
			1,
		);
		expect(
			result.resources.filter((r) => r.type === "D1Database"),
		).toHaveLength(1);
		expect(result.resources.filter((r) => r.type === "Queue")).toHaveLength(1);
		expect(
			result.resources.filter((r) => r.type === "DurableObjectNamespace"),
		).toHaveLength(1);

		// Bindings
		expect(result.workers[0].bindings.CACHE).toBeDefined();
		expect(result.workers[0].bindings.SESSION_STORE).toBeDefined();
		expect(result.workers[0].bindings.UPLOADS).toBeDefined();
		expect(result.workers[0].bindings.DB).toBeDefined();
		expect(result.workers[0].bindings.TASKS).toBeDefined();

		// Secrets
		expect(result.secrets).toContain("API_KEY");
		expect(result.plainTextVars.API_URL).toBe("https://api.example.com");

		// Routes
		expect(result.workers[0].routes).toHaveLength(2);

		// Crons
		expect(result.workers[0].crons).toContain("0 0 * * *");

		// Queue consumers
		expect(result.workers[0].eventSources).toHaveLength(1);
		expect(result.workers[0].eventSources?.[0].settings.batchSize).toBe(10);
	});

	it("should handle environment-specific configs", async () => {
		const parsed = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/with-environments.toml"),
		);

		// Check base config
		expect(parsed.config.name).toBe("env-worker");
		expect(parsed.config.environments.staging).toBeDefined();
		expect(parsed.config.environments.production).toBeDefined();

		// Transform staging environment
		const transformer = new ConfigTransformer();
		const stagingResult = transformer.transform(parsed.config, {
			targetEnvironment: "staging",
		});

		expect(stagingResult.workers[0].bindings.ENVIRONMENT).toBeDefined();

		// Transform production environment
		const prodResult = transformer.transform(parsed.config, {
			targetEnvironment: "production",
		});

		expect(
			prodResult.resources.filter((r) => r.type === "R2Bucket"),
		).toHaveLength(1);
	});

	it("should support custom naming with stage", async () => {
		const parsed = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);
		const transformer = new ConfigTransformer();

		const result = transformer.transform(parsed.config, {
			appName: "my-app",
			stage: "production",
			preserveNames: false,
		});

		expect(result.workers[0].props.name).toBe("my-app-production");
		expect(result.resources[0].props.title).toContain("production");
	});

	it("should handle resource adoption settings", async () => {
		const parsed = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/complex-worker.toml"),
		);
		const transformer = new ConfigTransformer();

		const adoptResult = transformer.transform(parsed.config, { adopt: true });
		expect(
			adoptResult.resources.every((r) =>
				r.type !== "DurableObjectNamespace" ? r.adopt : true,
			),
		).toBe(true);

		const noAdoptResult = transformer.transform(parsed.config, {
			adopt: false,
		});
		expect(
			noAdoptResult.resources.every((r) =>
				r.type !== "DurableObjectNamespace" ? !r.adopt : true,
			),
		).toBe(true);
	});
});
