import type { WranglerConfig } from "../parsers/schema.js";
import type { AlchemyResource } from "../types/alchemy.js";

export interface ResourceMappingOptions {
	adopt: boolean;
	preserveNames: boolean;
	stage?: string;
	appName: string;
}

/**
 * Maps wrangler resources to Alchemy resources
 */
export class ResourceMapper {
	constructor(private options: ResourceMappingOptions) {}

	/**
	 * Map KV Namespaces
	 */
	mapKVNamespaces(
		kvNamespaces?: WranglerConfig["kv_namespaces"],
	): AlchemyResource[] {
		if (!kvNamespaces || kvNamespaces.length === 0) return [];

		return kvNamespaces.map((kv: any, index: number) => {
			const id = this.sanitizeId(kv.binding.toLowerCase());
			const variableName = this.generateVariableName("kv", id, index);

			const title =
				this.options.preserveNames && kv.id
					? kv.binding // Use exact binding name
					: this.generateResourceName("kv", id);

			return {
				type: "KVNamespace" as const,
				id,
				variableName,
				adopt: this.options.adopt,
				props: {
					title,
					adopt: this.options.adopt,
				},
			};
		});
	}

	/**
	 * Map R2 Buckets
	 */
	mapR2Buckets(r2Buckets?: WranglerConfig["r2_buckets"]): AlchemyResource[] {
		if (!r2Buckets || r2Buckets.length === 0) return [];

		return r2Buckets.map((bucket: any, index: number) => {
			const id = this.sanitizeId(bucket.binding.toLowerCase());
			const variableName = this.generateVariableName("bucket", id, index);

			const name = this.options.preserveNames
				? bucket.bucket_name
				: this.generateResourceName("bucket", id);

			return {
				type: "R2Bucket" as const,
				id,
				variableName,
				adopt: this.options.adopt,
				props: {
					name,
					jurisdiction: bucket.jurisdiction,
					adopt: this.options.adopt,
				},
			};
		});
	}

	/**
	 * Map D1 Databases
	 */
	mapD1Databases(
		d1Databases?: WranglerConfig["d1_databases"],
	): AlchemyResource[] {
		if (!d1Databases || d1Databases.length === 0) return [];

		return d1Databases.map((db: any, index: number) => {
			const id = this.sanitizeId(db.binding.toLowerCase());
			const variableName = this.generateVariableName("db", id, index);

			const name = this.options.preserveNames
				? db.database_name
				: this.generateResourceName("db", id);

			return {
				type: "D1Database" as const,
				id,
				variableName,
				adopt: this.options.adopt,
				props: {
					name,
					migrationsDir: db.migrations_dir || undefined,
					adopt: this.options.adopt,
				},
			};
		});
	}

	/**
	 * Map Queue Producers
	 */
	mapQueues(queues?: WranglerConfig["queues"]): AlchemyResource[] {
		if (!queues?.producers || queues.producers.length === 0) return [];

		type ProducerType = NonNullable<
			NonNullable<WranglerConfig["queues"]>["producers"]
		>[number];
		return queues.producers.map((queue: ProducerType, index: number) => {
			const id = this.sanitizeId(queue.binding.toLowerCase());
			const variableName = this.generateVariableName("queue", id, index);

			const name = this.options.preserveNames
				? queue.queue
				: this.generateResourceName("queue", id);

			return {
				type: "Queue" as const,
				id,
				variableName,
				adopt: this.options.adopt,
				props: {
					name,
					adopt: this.options.adopt,
				},
			};
		});
	}

	/**
	 * Map Durable Object Namespaces
	 * NOTE: These are NOT awaited in Alchemy
	 */
	mapDurableObjects(
		durableObjects?: WranglerConfig["durable_objects"],
	): AlchemyResource[] {
		if (!durableObjects?.bindings || durableObjects.bindings.length === 0)
			return [];

		return durableObjects.bindings.map((do_: any, index: number) => {
			const id = this.sanitizeId(do_.name.toLowerCase());
			const variableName = this.generateVariableName("do", id, index);

			return {
				type: "DurableObjectNamespace" as const,
				id,
				variableName,
				adopt: false, // DOs typically defined in same worker
				props: {
					className: do_.class_name,
					scriptName: do_.script_name,
					// Note: sqlite option not in wrangler config
				},
			};
		});
	}

	private sanitizeId(id: string): string {
		return id.replace(/[^a-z0-9_]/gi, "_");
	}

	private generateVariableName(
		prefix: string,
		id: string,
		index: number,
	): string {
		// If ID is meaningful, use it; otherwise use index
		if (id && id !== "binding" && id !== prefix) {
			return `${id}`;
		}
		return `${prefix}${index > 0 ? index + 1 : ""}`;
	}

	private generateResourceName(type: string, id: string): string {
		const parts = [this.options.appName];

		if (id && id !== type) {
			parts.push(id);
		} else {
			parts.push(type);
		}

		if (this.options.stage) {
			parts.push(this.options.stage);
		}

		return parts.join("-");
	}
}
