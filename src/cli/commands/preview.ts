import chalk from 'chalk';
import { parseWranglerConfig } from '../../parsers/index.js';
import { ConfigTransformer } from '../../transformers/index.js';
import { generateAlchemyConfig } from '../../generators/alchemy-config.js';

export async function previewCommand(configPath: string, options: any) {
  try {
    console.log(chalk.blue('Generating preview...\n'));

    const parseResult = await parseWranglerConfig(configPath);
    const transformer = new ConfigTransformer();

    const alchemyConfig = transformer.transform(parseResult.config, {
      appName: parseResult.config.name,
      stage: options.stage,
      adopt: true,
      preserveNames: true,
      targetEnvironment: options.env,
    });

    const generatedConfig = generateAlchemyConfig(alchemyConfig);

    console.log(chalk.cyan('===== Generated alchemy.run.ts =====\n'));
    console.log(generatedConfig);
    console.log(chalk.cyan('\n====================================\n'));

    console.log(chalk.bold('Summary:'));
    console.log(`  App Name: ${alchemyConfig.appName}`);
    console.log(`  Stage: ${alchemyConfig.stage || '(none)'}`);
    console.log(`  Resources: ${alchemyConfig.resources.length}`);
    console.log(`  Workers: ${alchemyConfig.workers.length}`);
    console.log(`  Secrets: ${alchemyConfig.secrets.length}`);

  } catch (error: any) {
    console.error(chalk.red('❌ Preview failed:'), error.message);
    process.exit(1);
  }
}
