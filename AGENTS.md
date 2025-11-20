# Agent Guidelines

## Commands

- **Build**: `bun run build`
- **Lint/Fix**: `bun run check` / `bun run fix` (Biome)
- **Test**: `bun run test` (Vitest)
- **Single Test**: `bun run test -- <path/to/file>`

## Coding Standards

- **Runtime**: **Bun** exclusively. Use `Bun.file`, `Bun.serve`, etc. Avoid `node:*` if Bun equivalent exists.
- **Formatting**: Biome (Tabs, Double Quotes). Enforced via CI.
- **Imports**: ESM only. Organize imports.
- **Types**: Strict TS. No `any` (warned by Biome).
- **Structure**: `src/` for source, `tests/` for integration tests. Kebab-case filenames.

## Rules (from .cursor/rules)

- **Concision**: Be extremely concise. Sacrifice grammar for brevity.
- **Package Manager**: Use `bun install` (no npm/yarn/pnpm).
- **APIs**: `Bun.serve` (no Express), `bun:sqlite`, `Bun.redis`, `Bun.sql`.
- **Testing**: `bun test` / `vitest`.
- **Environment**: Bun loads `.env` automatically. No `dotenv`.
- **GitHub**: Use GitHub CLI (`gh`) for PRs/Issues.
