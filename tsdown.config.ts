import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/cli/index.ts"],
	format: ["esm"],
	outDir: "dist",
	dts: true,
	clean: true,
	platform: "node",
	target: "node18",
});
