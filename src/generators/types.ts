import type { AlchemyWorker } from "../types/alchemy.js";
import { TypeScriptBuilder } from "../utils/ast-builder.js";

export function generateWorkerTypes(_worker: AlchemyWorker): string {
	const builder = new TypeScriptBuilder();

	builder.addBlockComment([
		"Worker Environment Types",
		"Auto-generated type definitions for worker bindings",
	]);

	builder.addLine();

	// Import worker reference
	builder.addImport({
		named: ["worker"],
		from: "./alchemy.run.js",
	});

	builder.addLine();
	builder.addLine();

	// Generate Env type
	builder.addComment("Use this type for your worker environment");
	builder.addLine("export type Env = typeof worker.Env;");

	builder.addLine();
	builder.addLine();

	// Add usage example
	builder.addBlockComment([
		"Usage in your worker:",
		"",
		'import type { Env } from "./worker-env";',
		"",
		"export default {",
		"  async fetch(request: Request, env: Env, ctx: ExecutionContext) {",
		"    // env is fully typed with all your bindings",
		'    const value = await env.CACHE.get("key");',
		'    return new Response("OK");',
		"  }",
		"};",
	]);

	return builder.build();
}
