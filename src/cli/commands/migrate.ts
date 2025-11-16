import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { parseWranglerConfig } from '../../parsers/index.js';
import { ConfigTransformer } from '../../transformers/index.js';
import { generateAlchemyConfig } from '../../generators/alchemy-config.js';
import { generateWorkerTypes } from '../../generators/types.js';
import { generateEnvTemplate } from '../../generators/env-file.js';
import { generateMigrationReadme } from '../../generators/readme.js';
import { discoverWranglerConfig, detectProjectContext } from '../../utils/file-utils.js';
import { promptForMigrationOptions } from '../prompts.js';
import type { MigrationOptions } from '../../types/migration.js';

export async function migrateCommand(
  configPath: string,
  options: any
) {
  const spinner = ora();

  try {
    // Step 1: Discover or validate config file
    spinner.start('Discovering configuration...');

    let actualConfigPath: string;

    if (configPath === 'auto') {
      const discovered = discoverWranglerConfig(process.cwd());
      if (!discovered) {
        spinner.fail('No wrangler.toml or wrangler.json found');
        console.log(chalk.yellow('\nPlease specify the path to your wrangler configuration file.'));
        process.exit(1);
      }
      actualConfigPath = discovered.path;
      spinner.succeed(`Found configuration: ${chalk.cyan(discovered.path)}`);
    } else {
      if (!existsSync(configPath)) {
        spinner.fail(`Configuration file not found: ${configPath}`);
        process.exit(1);
      }
      actualConfigPath = configPath;
      spinner.succeed(`Using configuration: ${chalk.cyan(actualConfigPath)}`);
    }

    // Step 2: Detect project context
    const projectContext = detectProjectContext(dirname(actualConfigPath));

    // Step 3: Interactive prompts (if enabled)
    let migrationOptions: MigrationOptions = {
      sourceFile: actualConfigPath,
      outputDir: options.output,
      stage: options.stage,
      adopt: options.adopt,
      preserveNames: options.preserveNames,
      interactive: options.interactive,
      dryRun: options.dryRun,
    };

    if (options.interactive) {
      migrationOptions = await promptForMigrationOptions(migrationOptions, projectContext);
    }

    // Step 4: Parse configuration
    spinner.start('Parsing configuration...');
    const parseResult = await parseWranglerConfig(actualConfigPath);
    spinner.succeed('Configuration parsed successfully');

    if (parseResult.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      parseResult.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
    }

    // Step 5: Transform configuration
    spinner.start('Transforming to Alchemy format...');
    const transformer = new ConfigTransformer();
    const alchemyConfig = transformer.transform(parseResult.config, {
      appName: parseResult.config.name,
      stage: migrationOptions.stage,
      adopt: migrationOptions.adopt,
      preserveNames: migrationOptions.preserveNames,
      targetEnvironment: options.env,
    });
    spinner.succeed('Configuration transformed');

    // Step 6: Generate files
    spinner.start('Generating files...');

    const files = [
      {
        path: join(migrationOptions.outputDir, 'alchemy.run.ts'),
        content: generateAlchemyConfig(alchemyConfig),
        overwrite: true,
      },
      {
        path: join(migrationOptions.outputDir, 'worker-env.d.ts'),
        content: generateWorkerTypes(alchemyConfig.workers[0]),
        overwrite: true,
      },
      {
        path: join(migrationOptions.outputDir, '.env.example'),
        content: generateEnvTemplate(alchemyConfig),
        overwrite: false,
      },
      {
        path: join(migrationOptions.outputDir, 'MIGRATION.md'),
        content: generateMigrationReadme(
          alchemyConfig,
          {
            sourceFile: actualConfigPath,
            sourceFormat: parseResult.format,
            migratedAt: new Date().toISOString(),
            warnings: parseResult.warnings,
            manualSteps: [],
            version: '0.1.0',
          },
          projectContext
        ),
        overwrite: true,
      },
    ];

    spinner.succeed('Files generated');

    // Step 7: Write files (or preview for dry-run)
    if (migrationOptions.dryRun) {
      console.log(chalk.blue('\n📋 Dry Run - Files that would be created:\n'));
      files.forEach(file => {
        console.log(chalk.cyan(`  ${file.path}`));
        console.log(chalk.gray('  ' + '-'.repeat(60)));
        console.log(file.content.split('\n').slice(0, 10).map(l => `  ${l}`).join('\n'));
        console.log(chalk.gray('  ...\n'));
      });
    } else {
      spinner.start('Writing files...');

      for (const file of files) {
        if (!file.overwrite && existsSync(file.path)) {
          spinner.warn(`Skipped (already exists): ${file.path}`);
          continue;
        }

        const dir = dirname(file.path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        writeFileSync(file.path, file.content, 'utf-8');
      }

      spinner.succeed('Files written successfully');

      // Step 8: Success message with next steps
      console.log(chalk.green('\n✅ Migration completed successfully!\n'));
      console.log(chalk.bold('Files created:'));
      files.forEach(file => console.log(chalk.cyan(`  - ${file.path}`)));

      console.log(chalk.bold('\n📖 Next steps:'));
      console.log(chalk.white('  1. Review the generated files, especially alchemy.run.ts'));
      console.log(chalk.white('  2. Read MIGRATION.md for detailed instructions'));
      console.log(chalk.white('  3. Set up your .env file based on .env.example'));
      console.log(chalk.white(`  4. Install alchemy: ${projectContext.packageManager || 'npm'} install alchemy`));
      console.log(chalk.white('  5. Deploy: npx tsx alchemy.run.ts\n'));
    }

  } catch (error: any) {
    spinner.fail('Migration failed');
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}
