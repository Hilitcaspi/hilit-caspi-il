import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function inspectComponent(source: string, componentName: string) {
  const file = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = file.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === componentName,
  );
  if (!component?.body) throw new Error(`Missing component ${componentName}`);
  const hooks: Array<{ name: string; position: number }> = [];
  const returns: number[] = [];
  const visit = (node: ts.Node) => {
    // Nested callbacks/components have independent return and hook scopes.
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node)) returns.push(node.getStart(file));
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const name = ts.isIdentifier(expression) ? expression.text
        : ts.isPropertyAccessExpression(expression) ? expression.name.text : "";
      if (/^use[A-Z]/.test(name)) hooks.push({ name, position: node.getStart(file) });
    }
    ts.forEachChild(node, visit);
  };
  component.body.statements.forEach(visit);
  const firstReturn = Math.min(...returns);
  return { hooks, hooksAfterReturn: hooks.filter(hook => hook.position > firstReturn) };
}

const crmSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const novemberSource = readFileSync(resolve(process.cwd(), "client/src/components/NovemberMembersAdminSection.tsx"), "utf8");

describe("CRM auth transitions preserve React hook order", () => {
  it("detects the exact early-return-before-effect regression", () => {
    const result = inspectComponent(`function Example() {
      const [ready] = useState(false);
      if (!ready) return null;
      useEffect(() => { if (!ready) return; }, [ready]);
      return <main />;
    }`, "Example");
    expect(result.hooksAfterReturn.map(hook => hook.name)).toEqual(["useEffect"]);
  });

  it("runs all parent hooks before loading or admin authorization can return", () => {
    const result = inspectComponent(crmSource, "CRMMatchmaking");
    expect(result.hooks.length).toBeGreaterThan(20);
    expect(result.hooksAfterReturn).toEqual([]);
  });

  it("keeps November queue hooks above its loading and failure returns", () => {
    const result = inspectComponent(novemberSource, "NovemberMembersAdminSection");
    expect(result.hooks.map(hook => hook.name)).toEqual(["useState", "useState", "useState", "useQuery", "useEffect", "useMemo"]);
    expect(result.hooksAfterReturn).toEqual([]);
  });

  it("keeps the deep-link prefill admin-only and never runs comparison or delivery", () => {
    const start = crmSource.indexOf("// A November queue link may nominate only person A.");
    expect(start).toBeGreaterThan(0);
    const end = crmSource.indexOf("}, [loading, user?.role, activeTab, allSinglesForCompat, compatPersonA, selectedSingle]);", start);
    expect(end).toBeGreaterThan(start);
    const effect = crmSource.slice(start, end);
    expect(effect).toContain('if (loading || !user || user.role !== "admin") return;');
    expect(effect).toContain('if (activeTab !== "compatibility" || selectedSingle === null || compatPersonA === selectedSingle) return;');
    expect(effect).toContain("if (!allSinglesForCompat.some(single => single.id === selectedSingle)) return;");
    expect(effect).not.toMatch(/\.mutate|checkCompatibility\(|sendMatch\(/);
    expect(crmSource).toContain('if (!user || user.role !== "admin") {');
    expect(crmSource).toContain('enabled: !!user && user.role === "admin"');
  });
});
