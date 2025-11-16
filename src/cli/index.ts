#!/usr/bin/env node

import { Command } from 'commander';
import { migrateCommand } from './commands/migrate.js';
import { validateCommand } from './commands/validate.js';
import { previewCommand } from './commands/preview.js';

const program = new Command();

program
  .name('alchemy-migrator')
  .description('Migrate Cloudflare Wrangler projects to Alchemy')
  .version('0.1.0');

program
  .command('migrate')
  .description('Migrate wrangler configuration to Alchemy')
  .argument('[config]', 'Path to wrangler.toml or wrangler.json', 'auto')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-s, --stage <stage>', 'Stage name (e.g., prod, dev)')
  .option('--no-adopt', 'Do not adopt existing resources')
  .option('--no-preserve-names', 'Generate new resource names')
  .option('--env <environment>', 'Target specific wrangler environment')
  .option('-i, --interactive', 'Interactive mode with prompts', false)
  .option('--dry-run', 'Preview changes without writing files', false)
  .action(migrateCommand);

program
  .command('validate')
  .description('Validate wrangler configuration')
  .argument('<config>', 'Path to wrangler.toml or wrangler.json')
  .action(validateCommand);

program
  .command('preview')
  .description('Preview generated Alchemy configuration')
  .argument('<config>', 'Path to wrangler.toml or wrangler.json')
  .option('-s, --stage <stage>', 'Stage name')
  .option('--env <environment>', 'Target specific wrangler environment')
  .action(previewCommand);

program.parse();
