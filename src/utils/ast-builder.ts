/**
 * Utilities for building TypeScript code programmatically
 */

export interface ImportStatement {
  named?: string[];
  default?: string;
  namespace?: string;
  from: string;
}

export class TypeScriptBuilder {
  private lines: string[] = [];
  private indentLevel = 0;

  addImport(stmt: ImportStatement): this {
    let importStr = 'import ';

    const parts: string[] = [];

    if (stmt.default) {
      parts.push(stmt.default);
    }

    if (stmt.named && stmt.named.length > 0) {
      parts.push(`{ ${stmt.named.join(', ')} }`);
    }

    if (stmt.namespace) {
      parts.push(`* as ${stmt.namespace}`);
    }

    importStr += parts.join(', ');
    importStr += ` from "${stmt.from}";`;

    this.lines.push(importStr);
    return this;
  }

  addLine(line: string = ''): this {
    if (line) {
      this.lines.push('  '.repeat(this.indentLevel) + line);
    } else {
      this.lines.push('');
    }
    return this;
  }

  addComment(comment: string): this {
    return this.addLine(`// ${comment}`);
  }

  addBlockComment(lines: string[]): this {
    this.addLine('/**');
    lines.forEach(line => this.addLine(` * ${line}`));
    this.addLine(' */');
    return this;
  }

  indent(): this {
    this.indentLevel++;
    return this;
  }

  dedent(): this {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
    return this;
  }

  addConstDeclaration(name: string, value: string, exported = true): this {
    const prefix = exported ? 'export const' : 'const';
    return this.addLine(`${prefix} ${name} = ${value};`);
  }

  addAwaitConstDeclaration(name: string, value: string, exported = true): this {
    const prefix = exported ? 'export const' : 'const';
    return this.addLine(`${prefix} ${name} = await ${value};`);
  }

  addObjectLiteral(obj: Record<string, any>, multiline = true): string {
    if (!multiline || Object.keys(obj).length === 0) {
      return JSON.stringify(obj);
    }

    const entries = Object.entries(obj).map(([key, value]) => {
      const valueStr = this.formatValue(value);
      // Use quotes for keys with special characters
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      return `${keyStr}: ${valueStr}`;
    });

    return `{\n${'  '.repeat(this.indentLevel + 1)}${entries.join(',\n' + '  '.repeat(this.indentLevel + 1))}\n${'  '.repeat(this.indentLevel)}}`;
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      // Check if it's a reference (no quotes)
      if (value.startsWith('$ref:')) {
        return value.substring(5);
      }
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const items = value.map(v => this.formatValue(v));
      return `[${items.join(', ')}]`;
    }
    if (typeof value === 'object') {
      return this.addObjectLiteral(value, true);
    }
    return String(value);
  }

  build(): string {
    return this.lines.join('\n');
  }
}
