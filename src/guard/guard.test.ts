import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, runAgent } from "./agent";
import { calculate } from "./calculator";
import { SCENARIOS } from "./scenarios";
import { Blocked, initialSandbox, resolvePath } from "./sandbox";
import type { Policy, ToolCall } from "./types";

const policy = (over: Partial<Policy> = {}): Policy => ({ ...DEFAULT_POLICY, ...over });
const run = (steps: ToolCall[], over: Partial<Policy> = {}) =>
  runAgent(steps, policy(over), initialSandbox());
const call = (name: string, args: Record<string, unknown>): ToolCall => ({ name, args });

describe("resolvePath", () => {
  const sb = initialSandbox();

  it("allows ordinary paths", () => {
    expect(resolvePath(sb, "notes.txt")).toBe("notes.txt");
    expect(resolvePath(sb, "./a//b.txt")).toBe("a/b.txt");
    expect(resolvePath(sb, "a/../notes.txt")).toBe("notes.txt");
    expect(resolvePath(sb, ".")).toBe(".");
  });

  it.each(["../x", "a/../../x", "../../etc/passwd", "/etc/passwd", "C:\\Windows\\win.ini", "C:/x"])(
    "blocks %s",
    (bad) => {
      expect(() => resolvePath(sb, bad)).toThrow(Blocked);
    },
  );

  it("blocks a symlink that points outside", () => {
    expect(() => resolvePath(sb, "shortcut/passwd")).toThrow(Blocked);
  });

  it("blocks bad input", () => {
    for (const bad of ["", "a\0b", null, 5, undefined]) {
      expect(() => resolvePath(sb, bad)).toThrow(Blocked);
    }
  });

  it("stops symlink loops", () => {
    const loop = { entries: { a: { type: "symlink" as const, target: "b" }, b: { type: "symlink" as const, target: "a" } } };
    expect(() => resolvePath(loop, "a")).toThrow(Blocked);
  });
});

describe("permissions", () => {
  it("denies a tool the policy did not grant", () => {
    const r = run([call("write_file", { path: "a.txt", content: "x" })], { granted: ["fs.read"] });
    expect(r.steps[0].verdict).toBe("denied");
    expect(r.steps[0].defence).toBe("permission");
    expect(r.files["a.txt"]).toBeUndefined();
  });

  it("denies unknown tools, including ones named after object internals", () => {
    for (const name of ["delete_everything", "constructor", "toString", "__proto__"]) {
      const r = run([call(name, {})]);
      expect(r.steps[0].verdict).toBe("denied");
      expect(r.steps[0].reason).toBe("unknown tool");
    }
  });

  it("runs a granted tool", () => {
    const r = run([call("read_file", { path: "report.md" })]);
    expect(r.steps[0].verdict).toBe("allowed");
    expect(r.steps[0].output).toContain("Q4 report");
  });
});

describe("arguments", () => {
  it.each([
    [{ path: "notes.txt", mode: "w" }, "unexpected argument"],
    [{}, "missing argument"],
    [{ path: 5 }, "must be string"],
  ])("denies %j", (args, text) => {
    const r = run([call("read_file", args as Record<string, unknown>)]);
    expect(r.steps[0].verdict).toBe("denied");
    expect(r.steps[0].reason).toContain(text);
  });
});

describe("prompt injection", () => {
  const steps = [
    call("read_file", { path: "notes.txt" }),
    call("write_file", { path: "pwned.txt", content: "stolen" }),
  ];

  it("denies a write after reading untrusted data", () => {
    const r = run(steps);
    expect(r.steps[1].verdict).toBe("denied");
    expect(r.steps[1].defence).toBe("untrusted-data");
    expect(r.files["pwned.txt"]).toBeUndefined();
  });

  it("allows a write when nothing untrusted was read", () => {
    const r = run([steps[1]]);
    expect(r.steps[0].verdict).toBe("allowed");
    expect(r.files["pwned.txt"]).toBe("stolen");
  });

  it("lets a human approve the write", () => {
    const r = run(steps, { humanApproves: true });
    expect(r.steps[1].verdict).toBe("allowed");
    expect(r.files["pwned.txt"]).toBe("stolen");
  });

  it("can have the rule switched off", () => {
    const r = run(steps, { approveAfterUntrusted: false });
    expect(r.steps[1].verdict).toBe("allowed");
  });

  it("does not let a failed read taint the run", () => {
    const r = run([call("read_file", { path: "../x" }), steps[1]]);
    expect(r.steps[0].verdict).toBe("denied");
    expect(r.steps[1].verdict).toBe("allowed");
  });
});

describe("budget", () => {
  it("stops the run at the call budget", () => {
    const many = Array.from({ length: 20 }, () => call("calculator", { expression: "1+1" }));
    const r = run(many, { maxCalls: 3 });
    expect(r.stoppedByBudget).toBe(true);
    expect(r.steps).toHaveLength(4);
    expect(r.steps[3].defence).toBe("budget");
    expect(r.steps.slice(0, 3).every((s) => s.verdict === "allowed")).toBe(true);
  });

  it("counts denied calls too", () => {
    const r = run(Array.from({ length: 20 }, () => call("nope", {})), { maxCalls: 4 });
    expect(r.stoppedByBudget).toBe(true);
    expect(r.steps).toHaveLength(5);
  });
});

describe("output limit", () => {
  it("truncates long tool output", () => {
    const sb = initialSandbox();
    sb.entries["big.txt"] = { type: "file", content: "a".repeat(5000) };
    const r = runAgent([call("read_file", { path: "big.txt" })], policy({ maxOutputChars: 100 }), sb);
    expect(r.steps[0].output.endsWith("[truncated]")).toBe(true);
    expect(r.steps[0].output.length).toBeLessThan(200);
  });
});

describe("the sandbox is never changed in place", () => {
  it("leaves the original untouched after a run", () => {
    const sb = initialSandbox();
    runAgent([call("write_file", { path: "new.txt", content: "x" })], policy(), sb);
    expect(sb.entries["new.txt"]).toBeUndefined();
  });
});

describe("calculator", () => {
  it.each([
    ["2 + 3 * 4", "14"],
    ["(2 + 3) * 4", "20"],
    ["-(2 + 3)", "-5"],
    ["2 ** 3 ** 2", "512"],
    ["7 // 2", "3"],
    ["7 % 4", "3"],
    ["0.1 + 0.2", "0.3"],
    ["10 / 4", "2.5"],
  ])("%s = %s", (expr, expected) => {
    expect(calculate(expr)).toBe(expected);
  });

  it.each([
    "__import__('os').system('id')",
    "constructor.constructor('return 1')()",
    "alert(1)",
    "1 +",
    "(1",
    "1 2",
    "1..2",
    "2 ** 100000",
    "1 / 0",
    "5 % 0",
    "x",
    "a".repeat(300),
  ])("rejects %s", (expr) => {
    expect(() => calculate(expr)).toThrow();
  });
});

describe("scenarios", () => {
  it("the injection scenario ends with no stolen file", () => {
    const s = SCENARIOS.find((x) => x.id === "injection")!;
    const r = runAgent(s.steps, policy(s.policy), initialSandbox());
    expect(r.steps.map((x) => x.verdict)).toEqual(["allowed", "denied", "denied", "allowed"]);
    expect(r.files["pwned.txt"]).toBeUndefined();
  });

  it("the traversal scenario only lets the legitimate read through", () => {
    const s = SCENARIOS.find((x) => x.id === "traversal")!;
    const r = runAgent(s.steps, policy(s.policy), initialSandbox());
    expect(r.steps.map((x) => x.verdict)).toEqual(["denied", "denied", "denied", "denied", "allowed"]);
  });

  it("every scenario runs without throwing and has a title", () => {
    for (const s of SCENARIOS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(() => runAgent(s.steps, policy(s.policy), initialSandbox())).not.toThrow();
    }
  });
});
