import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_POLICY, runAgent } from "../guard/agent";
import { initialSandbox } from "../guard/sandbox";
import { SCENARIOS } from "../guard/scenarios";
import type { Defence, Permission, Policy, RunResult, ToolCall } from "../guard/types";
import { prefersReducedMotion } from "../hooks";

const PERMISSIONS: { id: Permission; label: string; hint: string }[] = [
  { id: "fs.read", label: "Read files", hint: "read_file, list_dir" },
  { id: "fs.write", label: "Write files", hint: "write_file" },
  { id: "compute", label: "Calculate", hint: "calculator" },
];

const DEFENCE_LABEL: Record<Defence, string> = {
  policy: "Unknown tool",
  permission: "Permission",
  arguments: "Argument check",
  sandbox: "Sandbox",
  "untrusted-data": "Untrusted-data rule",
  budget: "Call budget",
  "tool-error": "Tool error",
  none: "Allowed",
};

const TOOL_CHOICES = [
  { value: "read_file", label: "read_file" },
  { value: "list_dir", label: "list_dir" },
  { value: "write_file", label: "write_file" },
  { value: "calculator", label: "calculator" },
  { value: "delete_everything", label: "delete_everything (not a real tool)" },
];

const ATTACK_PATHS = ["../../etc/passwd", "/etc/passwd", "shortcut/passwd", "C:\\Windows\\win.ini"];

function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => {
      const text = typeof v === "string" && v.length > 40 ? v.slice(0, 40) + "…" : String(v);
      return `${k}=${typeof v === "string" ? JSON.stringify(text) : text}`;
    })
    .join(", ");
}

function scenarioPolicy(id: string): Policy {
  const s = SCENARIOS.find((x) => x.id === id);
  return { ...DEFAULT_POLICY, ...(s?.policy ?? {}) };
}

export default function Playground() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [policy, setPolicy] = useState<Policy>(() => scenarioPolicy(SCENARIOS[0].id));
  const [steps, setSteps] = useState<ToolCall[]>(SCENARIOS[0].steps);
  const [result, setResult] = useState<RunResult | null>(null);
  const [shown, setShown] = useState(0);

  const [tool, setTool] = useState("read_file");
  const [pathText, setPathText] = useState("../../etc/passwd");
  const [contentText, setContentText] = useState("hello");
  const [exprText, setExprText] = useState("2 + 2");

  const timer = useRef<number | undefined>(undefined);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const baseline = useMemo(() => initialSandbox(), []);

  const stopTimer = () => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  };
  useEffect(() => stopTimer, []);

  const chooseScenario = (id: string) => {
    stopTimer();
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    setScenarioId(id);
    setPolicy(scenarioPolicy(id));
    setSteps(s.steps);
    setResult(null);
    setShown(0);
  };

  const run = useCallback(() => {
    stopTimer();
    const r = runAgent(steps, policy, baseline);
    setResult(r);
    if (prefersReducedMotion()) {
      setShown(r.steps.length);
      return;
    }
    setShown(0);
    let n = 0;
    timer.current = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= r.steps.length) stopTimer();
    }, 520);
  }, [steps, policy, baseline]);

  const togglePermission = (p: Permission) => {
    setResult(null);
    setPolicy((cur) => ({
      ...cur,
      granted: cur.granted.includes(p) ? cur.granted.filter((x) => x !== p) : [...cur.granted, p],
    }));
  };

  const update = (patch: Partial<Policy>) => {
    setResult(null);
    setPolicy((cur) => ({ ...cur, ...patch }));
  };

  const addStep = () => {
    let args: Record<string, unknown> = {};
    if (tool === "read_file" || tool === "list_dir") args = { path: pathText };
    else if (tool === "write_file") args = { path: pathText, content: contentText };
    else if (tool === "calculator") args = { expression: exprText };
    setResult(null);
    setSteps((cur) => [...cur, { name: tool, args }]);
  };

  const removeStep = (index: number) => {
    setResult(null);
    setSteps((cur) => cur.filter((_, i) => i !== index));
  };

  const visible = result ? result.steps.slice(0, shown) : [];
  const finished = result !== null && shown >= result.steps.length;
  const allowed = result ? result.steps.filter((s) => s.verdict === "allowed").length : 0;
  const denied = result ? result.steps.filter((s) => s.verdict === "denied").length : 0;
  const newFiles = result
    ? Object.keys(result.files).filter((f) => !(f in baseline.entries) || baseline.entries[f].type !== "file")
    : [];
  const showsPath = tool === "read_file" || tool === "list_dir" || tool === "write_file";

  return (
    <div className="playground">
      <div className="chips" role="group" aria-label="Choose an attack">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip ${s.id === scenarioId ? "is-active" : ""}`}
            aria-pressed={s.id === scenarioId}
            onClick={() => chooseScenario(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <p className="scenario-blurb">{scenario?.blurb}</p>

      <div className="pg-grid">
        <section className="pg-col" aria-labelledby="pg-policy">
          <h3 id="pg-policy" className="pg-heading">1. Set the rules</h3>

          <fieldset className="field">
            <legend>What this run may do</legend>
            {PERMISSIONS.map((p) => (
              <label key={p.id} className="check">
                <input
                  type="checkbox"
                  checked={policy.granted.includes(p.id)}
                  onChange={() => togglePermission(p.id)}
                />
                <span>
                  {p.label} <small>{p.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label htmlFor="budget" className="range-label">
              Call budget <strong>{policy.maxCalls}</strong>
            </label>
            <input
              id="budget"
              type="range"
              min={1}
              max={10}
              value={policy.maxCalls}
              onChange={(e) => update({ maxCalls: Number(e.target.value) })}
            />
          </div>

          <fieldset className="field">
            <legend>Untrusted-data rule</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={policy.approveAfterUntrusted}
                onChange={(e) => update({ approveAfterUntrusted: e.target.checked })}
              />
              <span>
                Ask a human before any write that follows reading a file <small>recommended</small>
              </span>
            </label>
            <label className={`check ${policy.approveAfterUntrusted ? "" : "is-off"}`}>
              <input
                type="checkbox"
                disabled={!policy.approveAfterUntrusted}
                checked={policy.humanApproves}
                onChange={(e) => update({ humanApproves: e.target.checked })}
              />
              <span>
                The human clicks “approve” <small>try it: this is how a tricked human lets an attack through</small>
              </span>
            </label>
          </fieldset>
        </section>

        <section className="pg-col" aria-labelledby="pg-steps">
          <h3 id="pg-steps" className="pg-heading">2. The tricked model asks for…</h3>
          <ol className="step-list">
            {steps.length === 0 && <li className="empty">No steps yet. Add one below.</li>}
            {steps.map((s, i) => (
              <li key={`${i}-${s.name}-${JSON.stringify(s.args)}`} className="step-item">
                <code>
                  {s.name}({formatArgs(s.args)})
                </code>
                <button type="button" className="icon-btn" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`}>
                  ×
                </button>
              </li>
            ))}
          </ol>

          <div className="adder">
            <label htmlFor="tool">Add your own step</label>
            <select id="tool" value={tool} onChange={(e) => setTool(e.target.value)}>
              {TOOL_CHOICES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {showsPath && (
              <>
                <input
                  aria-label="Path"
                  value={pathText}
                  onChange={(e) => setPathText(e.target.value)}
                  placeholder="path, e.g. ../../etc/passwd"
                  spellCheck={false}
                />
                {tool !== "write_file" && (
                  <div className="quick" aria-label="Try a sneaky path">
                    {ATTACK_PATHS.map((p) => (
                      <button key={p} type="button" className="mini" onClick={() => setPathText(p)}>{p}</button>
                    ))}
                  </div>
                )}
              </>
            )}
            {tool === "write_file" && (
              <input aria-label="Content" value={contentText} onChange={(e) => setContentText(e.target.value)} placeholder="content" />
            )}
            {tool === "calculator" && (
              <input aria-label="Expression" value={exprText} onChange={(e) => setExprText(e.target.value)} placeholder="2 + 2" spellCheck={false} />
            )}
            <button type="button" className="btn ghost" onClick={addStep}>Add step</button>
          </div>
        </section>
      </div>

      <div className="run-row">
        <button type="button" className="btn primary" onClick={run} disabled={steps.length === 0}>
          Run the agent
        </button>
        <span className="task">Task given to the agent: <q>{scenario?.task ?? "Custom"}</q></span>
      </div>

      <section className="results" aria-labelledby="pg-results" aria-live="polite">
        <h3 id="pg-results" className="pg-heading">3. What the guard decided</h3>
        {!result && <p className="empty">Press “Run the agent” to see each step judged.</p>}

        <ol className="timeline">
          {visible.map((s, i) => (
            <li
              key={i}
              className={`event ${s.verdict} ${i % 2 === 0 ? "from-left" : "from-right"} in`}
            >
              <div className="event-top">
                <span className={`verdict ${s.verdict}`}>{s.verdict === "allowed" ? "✓ Allowed" : "✕ Blocked"}</span>
                <span className="badge">{DEFENCE_LABEL[s.defence]}</span>
              </div>
              <code className="event-call">{s.call.name}({formatArgs(s.call.args)})</code>
              <p className="event-why">{s.reason}</p>
              {s.output && <pre className="event-out">{s.output}</pre>}
            </li>
          ))}
        </ol>

        {finished && result && (
          <div className="summary in" role="status">
            <strong>
              {allowed} allowed · {denied} blocked
            </strong>
            <span>
              {newFiles.length === 0
                ? "No new files were created."
                : `New files created: ${newFiles.join(", ")}.`}
              {result.stoppedByBudget ? " The run was cut off by the call budget." : ""}
            </span>
            {newFiles.includes("pwned.txt") && (
              <span className="warn">The attack succeeded. Switch the untrusted-data rule back on and run again.</span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
