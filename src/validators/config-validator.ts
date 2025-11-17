import type { WranglerConfig } from "../parsers/schema.js";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export function validateConfig(config: WranglerConfig): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Required fields
	if (!config.name) {
		errors.push("Missing required field: name");
	}

	// Validate bindings don't conflict
	const bindingNames = new Set<string>();

	const addBinding = (name: string, _type: string) => {
		if (bindingNames.has(name)) {
			errors.push(`Duplicate binding name: ${name}`);
		}
		bindingNames.add(name);
	};

	config.kv_namespaces?.forEach((kv: any) => {
		addBinding(kv.binding, "KV");
	});
	config.r2_buckets?.forEach((r2: any) => {
		addBinding(r2.binding, "R2");
	});
	config.d1_databases?.forEach((db: any) => {
		addBinding(db.binding, "D1");
	});
	config.queues?.producers?.forEach((q: any) => {
		addBinding(q.binding, "Queue");
	});

	if (config.services && config.services.length > 0) {
		warnings.push("Service bindings require manual configuration in Alchemy");
	}

	if (config.unsafe) {
		warnings.push("Unsafe bindings may require manual migration");
	}

	if (config.site) {
		warnings.push(
			"Static site configuration should use Alchemy Assets resource",
		);
	}

	if (config.tail_consumers && config.tail_consumers.length > 0) {
		warnings.push("Tail consumers require manual configuration");
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
