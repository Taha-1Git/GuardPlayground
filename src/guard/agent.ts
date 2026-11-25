import { calculate } from "./calculator";
import {
  Blocked,
  ToolError,
  cloneSandbox,
  listDir,
  readFile,
  writeFile,
  type Sandbox,
} from "./sandbox";
import type { Defence, Permission, Policy, RunResult, StepResult, ToolCall } from "./types";

interface ToolSpec {
  permissions: Permission[];
  params: Record<string, "string">;
  sideEffect: boolean;
  untrustedOutput: boolean;
  run: (sb: Sandbox, args: Record<string, unknown>) => string;
}

export const TOOLS: Record<string, ToolSpec> = {
  read_file: {
    permissions: ["fs.read"],
    params: { path: "string" },
    sideEffect: false,
    untrustedOutput: true,
    run: (sb, a) => readFile(sb, a.path),
  },
  list_dir: {
    permissions: ["fs.read"],
    params: { path: "string" },
    sideEffect: false,
    untrustedOutput: true,
    run: (sb, a) => listDir(sb, a.path),
  },
  write_file: {
    permissions: ["fs.write"],
    params: { path: "string", content: "string" },
    sideEffect: true,
    untrustedOutput: false,
    run: (sb, a) => writeFile(sb, a.path, a.content as string),
  },
  calculator: {
    permissions: ["compute"],
    params: { expression: "string" },
    sideEffect: false,
    untrustedOutput: false,
    run: (_sb, a) => calculate(a.expression),
  },
};

export const DEFAULT_POLICY: Policy = {
  granted: ["fs.read", "fs.write", "compute"],
  maxCalls: 6,
  approveAfterUntrusted: true,
  humanApproves: false,
  maxOutputChars: 400,
};

interface Decision {
  allowed: boolean;
  reason: string;
  defence: Defence;
}

const deny = (defence: Defence, reason: string): Decision => ({ allowed: false, reason, defence });

function argumentProblem(params: Record<string, string>, args: unknown): string {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return "arguments must be an object";
  }
  const given = Object.keys(args);
  const extra = given.filter((k) => !(k in params));
  if (extra.length) return "unexpected argument: " + extra.sort().join(", ");
  for (const [name, type] of Object.entries(params)) {
    if (!(name in (args as object))) return `missing argument: ${name}`;
    if (typeof (args as Record<string, unknown>)[name] !== type) {
      return `argument ${name} must be ${type}`;
    }
  }
  return "";
}

/**
 * The guard. It never asks the model for permission or believes anything the
 * model says about itself: it only looks at the call, the tool's declaration
 * and the policy.
 */
export function check(call: ToolCall, policy: Policy, tainted: boolean): Decision {
  const spec = Object.prototype.hasOwnProperty.call(TOOLS, call.name) ? TOOLS[call.name] : undefined;
  if (!spec) return deny("policy", "unknown tool");

  const missing = spec.permissions.filter((p) => !policy.granted.includes(p));
  if (missing.length) return deny("permission", "missing permission: " + missing.sort().join(", "));

  const problem = argumentProblem(spec.params, call.args);
  if (problem) return deny("arguments", problem);

  if (spec.sideEffect && tainted && policy.approveAfterUntrusted) {
    const reason = "side-effect tool after reading untrusted data";
    if (!policy.humanApproves) return deny("untrusted-data", "approval required: " + reason);
    return { allowed: true, reason: "approved by a human after untrusted read", defence: "untrusted-data" };
  }

  return { allowed: true, reason: "allowed by policy", defence: "none" };
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + "\n[truncated]" : text;
}

/** Run a list of model-requested calls through the guard, in order. */
export function runAgent(steps: ToolCall[], policy: Policy, sandbox: Sandbox): RunResult {
  const sb = cloneSandbox(sandbox);
  const results: StepResult[] = [];
  let tainted = false;
  let stoppedByBudget = false;

  for (let i = 0; i < steps.length; i++) {
    const call = steps[i];

    if (i >= policy.maxCalls) {
      results.push({
        call,
        verdict: "denied",
        reason: "call budget exhausted",
        defence: "budget",
        output: `The run was stopped after ${policy.maxCalls} calls. ${steps.length - i} step(s) never ran.`,
      });
      stoppedByBudget = true;
      break;
    }

    const decision = check(call, policy, tainted);
    if (!decision.allowed) {
      results.push({
        call,
        verdict: "denied",
        reason: decision.reason,
        defence: decision.defence,
        output: "DENIED: " + decision.reason,
      });
      continue;
    }

    const spec = TOOLS[call.name];
    try {
      const output = spec.run(sb, call.args);
      if (spec.untrustedOutput) tainted = true;
      results.push({
        call,
        verdict: "allowed",
        reason: decision.reason,
        defence: decision.defence,
        output: truncate(output, policy.maxOutputChars),
      });
    } catch (err) {
      if (err instanceof Blocked) {
        results.push({
          call,
          verdict: "denied",
          reason: "blocked by tool: " + err.message,
          defence: "sandbox",
          output: "DENIED: " + err.message,
        });
      } else if (err instanceof ToolError) {
        results.push({
          call,
          verdict: "allowed",
          reason: decision.reason + "; tool error",
          defence: "tool-error",
          output: "ERROR: " + err.message,
        });
      } else {
        results.push({
          call,
          verdict: "allowed",
          reason: decision.reason + "; tool crashed",
          defence: "tool-error",
          output: "ERROR: tool failed",
        });
      }
    }
  }

  const files: Record<string, string> = {};
  for (const [name, entry] of Object.entries(sb.entries)) {
    if (entry.type === "file") files[name] = entry.content;
  }
  return { steps: results, files, stoppedByBudget };
}
