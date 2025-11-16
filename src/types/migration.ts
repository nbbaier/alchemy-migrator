import type { MigrationMetadata } from './alchemy.js';

export interface MigrationOutput {
  files: Array<{
    path: string;
    content: string;
    overwrite: boolean;
  }>;
  metadata: MigrationMetadata;
  instructions: string[];
}

export interface MigrationOptions {
  sourceFile: string;
  outputDir: string;
  stage?: string;
  adopt?: boolean; // Default true
  preserveNames?: boolean; // Use exact wrangler names
  interactive?: boolean;
  dryRun?: boolean;
}
