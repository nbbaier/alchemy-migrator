import type {
	NormalizedWranglerConfig,
	WranglerConfig,
} from "../parsers/schema.js";
import type { AlchemyConfig, AlchemyWorker } from "../types/alchemy.js";
import { BindingTransformer } from "./binding-transformer.js";
import { ResourceMapper } from "./resource-mapper.js";

export interface TransformOptions {
	appName?: string;
	stage?: string;
	adopt?: boolean;
	preserveNames?: boolean;
	targetEnvironment?: string; // Which env from config to use
}

/**
 * Main transformer that converts WranglerConfig to AlchemyConfig
 */
export class ConfigTransformer {
	transform(
		wranglerConfig: NormalizedWranglerConfig,
		options: TransformOptions = {},
	): AlchemyConfig {
		const appName = options.appName || wranglerConfig.name;
		const stage = options.stage;
		const adopt = options.adopt ?? true;
		const preserveNames = options.preserveNames ?? true;

		// Select which config to use (base or specific environment)
		const targetConfig = options.targetEnvironment
			? wranglerConfig.environments[options.targetEnvironment]
			: wranglerConfig;

		// Initialize mapper
		const mapper = new ResourceMapper({
			adopt,
			preserveNames,
			stage,
			appName,
		});

		// Map all resources
		const resources = [
			...mapper.mapKVNamespaces(targetConfig.kv_namespaces),
			...mapper.mapR2Buckets(targetConfig.r2_buckets),
			...mapper.mapD1Databases(targetConfig.d1_databases),
			...mapper.mapQueues(targetConfig.queues),
			...mapper.mapDurableObjects(targetConfig.durable_objects),
		];

		// Build resource lookup map
		const resourceMap = new Map<string, string>();
		for (const resource of resources) {
			const key = `${resource.type.toLowerCase().replace(/namespace|database|bucket/gi, "")}:${resource.id}`;
			resourceMap.set(key, resource.variableName);
		}

		// Transform bindings
		const secrets = new Set<string>();
		const bindingContext = { resources: resourceMap, secrets };
		const bindings = BindingTransformer.transformBindings(
			targetConfig,
			bindingContext,
		);

		// Build worker configuration
		const worker: AlchemyWorker = {
			id: "worker",
			variableName: "worker",
			props: {
				name: preserveNames
					? targetConfig.name
					: stage
						? `${appName}-${stage}`
						: appName,
				entrypoint: targetConfig.main || "./src/index.js",
				compatibilityDate: targetConfig.compatibility_date,
				compatibilityFlags: targetConfig.compatibility_flags,
				observability: targetConfig.observability,
			},
			bindings,
			routes: this.transformRoutes(targetConfig.routes),
			crons: targetConfig.triggers?.crons,
			eventSources: this.transformQueueConsumers(
				targetConfig.queues?.consumers,
				resourceMap,
			),
		};

		return {
			appName,
			stage,
			resources,
			workers: [worker],
			secrets: Array.from(secrets),
			plainTextVars: this.extractPlainVars(targetConfig.vars || {}, secrets),
		};
	}

	private transformRoutes(routes?: WranglerConfig["routes"]) {
		if (!routes) return undefined;

		return routes.map((route: any) => {
			if (typeof route === "string") {
				return { pattern: route };
			}
			return {
				pattern: route.pattern,
				zoneId: route.zone_id,
				zoneName: route.zone_name,
			};
		});
	}

	private transformQueueConsumers(
		consumers: WranglerConfig["queues"]["consumers"],
		resourceMap: Map<string, string>,
	) {
		if (!consumers || consumers.length === 0) return undefined;

		return consumers.map((consumer: any) => ({
			queueRef: resourceMap.get(`queue:${consumer.queue}`) || consumer.queue,
			settings: {
				batchSize: consumer.max_batch_size,
				maxWaitTimeMs: consumer.max_batch_timeout,
				maxRetries: consumer.max_retries,
				maxConcurrency: consumer.max_concurrency,
				deadLetterQueue: consumer.dead_letter_queue,
			},
		}));
	}

	private extractPlainVars(
		vars: Record<string, any>,
		secrets: Set<string>,
	): Record<string, string> {
		const plainVars: Record<string, string> = {};

		for (const [key, value] of Object.entries(vars)) {
			if (!secrets.has(key) && typeof value === "string") {
				plainVars[key] = value;
			}
		}

		return plainVars;
	}
}
