import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const TEMPLATES_DIR = join(import.meta.dirname, "../../templates");

function walkTemplates(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkTemplates(full));
    } else if (extname(full) === ".md" || extname(full) === ".tmpl") {
      results.push(full);
    }
  }
  return results;
}

const HOSTILE_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /<details>/gi, name: "<details> tag" },
  { pattern: /<\/details>/gi, name: "</details> tag" },
  { pattern: /<summary>/gi, name: "<summary> tag" },
  { pattern: /<\/summary>/gi, name: "</summary> tag" },
  { pattern: /^!!!\s/gm, name: "MkDocs admonition" },
  { pattern: /^:::\s/gm, name: "mdbook admonition" },
  { pattern: /import\s+.*from\s+["']react["']/g, name: "JSX import" },
  { pattern: /<[A-Z][a-zA-Z]+[\s/>]/g, name: "JSX component (capitalized tag)" },
];

describe("Notion-safe templates", () => {
  const templates = walkTemplates(TEMPLATES_DIR);

  it("should find at least one template", () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  for (const templatePath of templates) {
    const relative = templatePath.replace(TEMPLATES_DIR + "/", "");
    const content = readFileSync(templatePath, "utf-8");

    for (const { pattern, name } of HOSTILE_PATTERNS) {
      it(`${relative} should not contain ${name}`, () => {
        const matches = content.match(pattern);
        expect(matches).toBeNull();
      });
    }
  }
});
