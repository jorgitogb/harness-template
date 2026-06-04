import { describe, it, expect } from "vitest";
import { loadTemplate, render, renderTemplate, getStackVars } from "../../src/render.js";

describe("loadTemplate", () => {
  it("loads a template file", () => {
    const content = loadTemplate("shared/AGENTS.md.tmpl");
    expect(content).toContain("AGENTS.md");
  });

  it("loads stack-specific template", () => {
    const content = loadTemplate("stack/python/.gitignore");
    expect(content).toContain("__pycache__");
  });
});

describe("render", () => {
  it("replaces template variables", () => {
    const template = "Hello {{NAME}}, welcome to {{PROJECT}}.";
    const result = render(template, { NAME: "World", PROJECT: "Test" });
    expect(result).toBe("Hello World, welcome to Test.");
  });

  it("handles multiple occurrences", () => {
    const template = "{{X}} and {{X}} again";
    const result = render(template, { X: "Y" });
    expect(result).toBe("Y and Y again");
  });

  it("leaves unmatched variables as-is", () => {
    const template = "Hello {{NAME}} {{UNKNOWN}}";
    const result = render(template, { NAME: "World" });
    expect(result).toBe("Hello World {{UNKNOWN}}");
  });
});

describe("renderTemplate", () => {
  it("loads and renders a template", () => {
    const result = renderTemplate("shared/feature_list.json.tmpl", {
      PROJECT_NAME: "my-project",
      PROJECT_DESCRIPTION: "A test project",
      STACK_CONVENTIONS: "",
      RUNTIME_CHECKS: "",
      TEST_COMMAND: "",
    });
    expect(result).toContain("my-project");
    expect(result).toContain("A test project");
  });
});

describe("getStackVars", () => {
  it("returns Python stack vars", () => {
    const vars = getStackVars("python");
    expect(vars.STACK_CONVENTIONS).toContain("PEP 8");
    expect(vars.RUNTIME_CHECKS).toContain("python3");
    expect(vars.TEST_COMMAND).toContain("pytest");
  });

  it("returns Node stack vars", () => {
    const vars = getStackVars("node");
    expect(vars.STACK_CONVENTIONS).toContain("Prettier");
    expect(vars.RUNTIME_CHECKS).toContain("node");
    expect(vars.TEST_COMMAND).toContain("npm test");
  });

  it("returns Go stack vars", () => {
    const vars = getStackVars("go");
    expect(vars.STACK_CONVENTIONS).toContain("gofmt");
    expect(vars.RUNTIME_CHECKS).toContain("go");
    expect(vars.TEST_COMMAND).toContain("go test");
  });

  it("returns Rust stack vars", () => {
    const vars = getStackVars("rust");
    expect(vars.STACK_CONVENTIONS).toContain("rustfmt");
    expect(vars.RUNTIME_CHECKS).toContain("rustc");
    expect(vars.TEST_COMMAND).toContain("cargo test");
  });

  it("returns generic stack vars", () => {
    const vars = getStackVars("generic");
    expect(vars.STACK_CONVENTIONS).toContain("Choose your conventions");
    expect(vars.TEST_COMMAND).toContain("warn");
  });

  it("merges React conventions when framework=react", () => {
    const vars = getStackVars("node", "react");
    expect(vars.STACK_CONVENTIONS).toContain("Prettier");
    expect(vars.STACK_CONVENTIONS).toContain("Components");
    expect(vars.STACK_CONVENTIONS).toContain("PascalCase");
    expect(vars.STACK_CONVENTIONS).toContain("@testing-library/react");
    expect(vars.TEST_COMMAND).toContain("npm test");
  });

  it("merges Astro conventions when framework=astro", () => {
    const vars = getStackVars("node", "astro");
    expect(vars.STACK_CONVENTIONS).toContain("Prettier");
    expect(vars.STACK_CONVENTIONS).toContain(".astro");
    expect(vars.STACK_CONVENTIONS).toContain("Islands");
    expect(vars.STACK_CONVENTIONS).toContain("Content Collections");
    expect(vars.TEST_COMMAND).toContain("astro check");
  });

  it("returns generic Node vars when framework=none", () => {
    const vars = getStackVars("node", "none");
    expect(vars.STACK_CONVENTIONS).toContain("Prettier");
    expect(vars.STACK_CONVENTIONS).not.toContain("Components");
    expect(vars.TEST_COMMAND).toContain("npm test");
    expect(vars.TEST_COMMAND).not.toContain("astro check");
  });
});
