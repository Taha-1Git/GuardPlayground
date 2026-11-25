export type Permission = "fs.read" | "fs.write" | "compute";

export type ToolName = "read_file" | "list_dir" | "write_file" | "calculator";

/** One thing the (possibly tricked) model asks the agent to do. */
export interface ToolCall {
  name: string; // a string on purpose: a model can ask for a tool that does not exist
  args: Record<string, unknown>;
}

export interface Policy {
  granted: Permission[];
  maxCalls: number;
  approveAfterUntrusted: boolean;
  /** What the human says when asked to approve a risky call. */
  humanApproves: boolean;
  maxOutputChars: number;
}

export type Verdict = "allowed" | "denied";

export interface StepResult {
  call: ToolCall;
  verdict: Verdict;
  /** Short reason from the guard, e.g. "missing permission: fs.write". */
  reason: string;
  /** The defence that fired, used for the badge in the UI. */
  defence: Defence;
  /** What the tool returned, or the error text. */
  output: string;
}

export type Defence =
  | "policy"
  | "permission"
  | "arguments"
  | "sandbox"
  | "untrusted-data"
  | "budget"
  | "tool-error"
  | "none";

export interface RunResult {
  steps: StepResult[];
  files: Record<string, string>;
  stoppedByBudget: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  blurb: string;
  task: string;
  steps: ToolCall[];
  /** Policy changes this scenario starts with. */
  policy?: Partial<Policy>;
}
