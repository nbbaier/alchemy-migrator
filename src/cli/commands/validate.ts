import chalk from "chalk";
import { parseWranglerConfig } from "../../parsers/index.js";
import { validateConfig } from "../../validators/config-validator.js";

export async function validateCommand(configPath: string) {
	try {
		console.log(chalk.blue("Validating wrangler configuration...\n"));

		const parseResult = await parseWranglerConfig(configPath);

		console.log(chalk.green("✅ Configuration is valid!\n"));

		console.log(chalk.bold("Configuration Summary:"));
		console.log(`  Name: ${parseResult.config.name}`);
		console.log(`  Main: ${parseResult.config.main}`);
		console.log(
			`  Compatibility Date: ${parseResult.config.compatibility_date}`,
		);

		const resourceCounts = {
			kv: parseResult.config.kv_namespaces?.length || 0,
			r2: parseResult.config.r2_buckets?.length || 0,
			d1: parseResult.config.d1_databases?.length || 0,
			queues: parseResult.config.queues?.producers?.length || 0,
			do: parseResult.config.durable_objects?.bindings?.length || 0,
		};

		console.log(chalk.bold("\nResources:"));
		console.log(`  KV Namespaces: ${resourceCounts.kv}`);
		console.log(`  R2 Buckets: ${resourceCounts.r2}`);
		console.log(`  D1 Databases: ${resourceCounts.d1}`);
		console.log(`  Queues: ${resourceCounts.queues}`);
		console.log(`  Durable Objects: ${resourceCounts.do}`);

		if (parseResult.warnings.length > 0) {
			console.log(chalk.yellow("\n⚠️  Warnings:"));
			parseResult.warnings.forEach((w) => {
				console.log(chalk.yellow(`  - ${w}`));
			});
		}

		const validation = validateConfig(parseResult.config);
		if (validation.warnings.length > 0) {
			console.log(chalk.yellow("\n⚠️  Additional Warnings:"));
			validation.warnings.forEach((w) => {
				console.log(chalk.yellow(`  - ${w}`));
			});
		}
	} catch (error: any) {
		console.error(chalk.red("❌ Validation failed:"), error.message);
		process.exit(1);
	}
}
