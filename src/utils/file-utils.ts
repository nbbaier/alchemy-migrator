import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ConfigFormat } from '../parsers/index.js';

export interface DiscoveredConfig {
  path: string;
  format: ConfigFormat;
}

/**
 * Auto-discovers wrangler configuration in a directory
 */
export function discoverWranglerConfig(dir: string): DiscoveredConfig | null {
  const candidates = [
    { path: join(dir, 'wrangler.json'), format: 'json' as const },
    { path: join(dir, 'wrangler.toml'), format: 'toml' as const },
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate.path)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Detects project type based on package.json and other indicators
 */
export interface ProjectContext {
  hasPackageJson: boolean;
  framework?: 'vite' | 'nuxt' | 'sveltekit' | 'astro' | 'remix' | 'next';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  typescript: boolean;
  hasSourceDir: boolean;
  entrypoint?: string;
}

export function detectProjectContext(dir: string): ProjectContext {
  const context: ProjectContext = {
    hasPackageJson: existsSync(join(dir, 'package.json')),
    typescript: existsSync(join(dir, 'tsconfig.json')),
    hasSourceDir: existsSync(join(dir, 'src')),
  };

  if (context.hasPackageJson) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));

    // Detect framework
    if (pkg.dependencies?.vite || pkg.devDependencies?.vite) context.framework = 'vite';
    if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) context.framework = 'nuxt';
    if (pkg.dependencies?.['@sveltejs/kit']) context.framework = 'sveltekit';
    if (pkg.dependencies?.astro) context.framework = 'astro';

    // Detect package manager
    if (existsSync(join(dir, 'bun.lockb'))) context.packageManager = 'bun';
    else if (existsSync(join(dir, 'pnpm-lock.yaml'))) context.packageManager = 'pnpm';
    else if (existsSync(join(dir, 'yarn.lock'))) context.packageManager = 'yarn';
    else if (existsSync(join(dir, 'package-lock.json'))) context.packageManager = 'npm';
  }

  // Try to detect entrypoint
  const possibleEntrypoints = [
    'src/index.ts',
    'src/index.js',
    'src/worker.ts',
    'src/worker.js',
    'index.ts',
    'index.js',
  ];

  for (const entry of possibleEntrypoints) {
    if (existsSync(join(dir, entry))) {
      context.entrypoint = entry;
      break;
    }
  }

  return context;
}
