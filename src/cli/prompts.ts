import prompts from "prompts";
import type { MigrationOptions } from "../types/migration.js";
import type { ProjectContext } from "../utils/file-utils.js";

export async function promptForMigrationOptions(
	initial: MigrationOptions,
	_context: ProjectContext,
): Promise<MigrationOptions> {
	const questions: prompts.PromptObject[] = [
		{
			type: "text",
			name: "stage",
			message: "Stage name (leave empty for default)",
			initial: initial.stage || "",
		},
		{
			type: "confirm",
			name: "adopt",
			message: "Adopt existing resources (recommended)?",
			initial: initial.adopt ?? true,
		},
		{
			type: "confirm",
			name: "preserveNames",
			message: "Preserve exact resource names from wrangler?",
			initial: initial.preserveNames ?? true,
		},
		{
			type: "text",
			name: "outputDir",
			message: "Output directory",
			initial: initial.outputDir || ".",
		},
	];

	const answers = await prompts(questions);

	return {
		...initial,
		...answers,
	};
}
