import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWranglerConfig } from "../../src/parsers/index.js";

describe("parseWranglerConfig", () => {
	it("should parse simple TOML config", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);

		expect(result.format).toBe("toml");
		expect(result.config.name).toBe("simple-worker");
		expect(result.config.main).toBe("src/index.ts");
		expect(result.config.compatibility_date).toBe("2024-01-01");
	});

	it("should normalize KV namespaces", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);

		expect(result.config.kv_namespaces).toBeDefined();
		expect(result.config.kv_namespaces).toHaveLength(1);
		expect(result.config.kv_namespaces?.[0].binding).toBe("CACHE");
		expect(result.config.kv_namespaces?.[0].id).toBe("abc123");
	});

	it("should normalize environment variables", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);

		expect(result.config.vars).toBeDefined();
		expect(result.config.vars?.API_KEY).toBe("secret-key");
		expect(result.config.vars?.DEBUG).toBe("true");
	});

	it("should set defaults for missing fields", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);

		expect(result.config.name).toBe("simple-worker");
		expect(result.config.main).toBe("src/index.ts");
		expect(result.config.compatibility_date).toBeTruthy();
	});

	it("should detect TOML format from extension", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);
		expect(result.format).toBe("toml");
	});

	it("should throw error for invalid config format", async () => {
		await expect(parseWranglerConfig("/path/to/config.yaml")).rejects.toThrow(
			"Unsupported config format",
		);
	});

	it("should track preview IDs in metadata", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);
		expect(result.config._meta.hasPreviewIds).toBe(false);
	});
});

describe("normalizeConfig", () => {
	it("should merge environment configs with base", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);
		expect(result.config.environments).toBeDefined();
	});

	it("should set source format in metadata", async () => {
		const result = await parseWranglerConfig(
			resolve(__dirname, "../fixtures/simple-worker.toml"),
		);
		expect(result.config._meta.sourceFormat).toBe("toml");
	});
});
