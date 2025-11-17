/**
 * Intermediate representation of Alchemy configuration
 * Used to generate the final alchemy.run.ts file
 */
export interface AlchemyConfig {
	appName: string;
	stage?: string;
	resources: AlchemyResource[];
	workers: AlchemyWorker[];
	secrets: string[];
	plainTextVars: Record<string, string>;
}

export interface AlchemyResource {
	type:
		| "KVNamespace"
		| "R2Bucket"
		| "D1Database"
		| "Queue"
		| "DurableObjectNamespace";
	id: string; // Resource identifier in code
	variableName: string; // Variable name to export
	props: any; // Type-specific props
	adopt: boolean;
}

export interface AlchemyWorker {
	id: string;
	variableName: string;
	props: Partial<WorkerProps>;
	bindings: Record<string, AlchemyBinding>;
	routes?: Array<{
		pattern: string;
		zoneId?: string;
		zoneName?: string;
	}>;
	domains?: string[];
	crons?: string[];
	eventSources?: Array<{
		queueRef: string;
		settings?: any;
	}>;
}

export type AlchemyBinding =
	| { type: "resource"; resourceRef: string }
	| { type: "secret"; secretName: string }
	| { type: "plainText"; value: string }
	| { type: "json"; value: any };

/**
 * Metadata about the migration
 */
export interface MigrationMetadata {
	sourceFile: string;
	sourceFormat: "toml" | "json";
	migratedAt: string;
	warnings: string[];
	manualSteps: string[];
	version: string;
}

// Partial worker props type (will be expanded as needed)
export interface WorkerProps {
	name: string;
	entrypoint: string;
	compatibilityDate: string;
	compatibilityFlags?: string[];
	observability?: {
		enabled: boolean;
		headSamplingRate?: number;
	};
	placement?: {
		mode: "smart";
	};
	usage_model?: "bundled" | "unbound";
	logpush?: boolean;
	bindings?: Record<string, any>;
	routes?: any[];
	crons?: string[];
	eventSources?: any[];
}
