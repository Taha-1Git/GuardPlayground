import Playground from "./components/Playground";
import Reveal from "./components/Reveal";
import ShieldArt from "./components/ShieldArt";
import { useActiveSection, useScrollProgress } from "./hooks";

const REPO = "https://github.com/Taha-1Git/SecureAgent";
const SITE_REPO = "https://github.com/Taha-1Git/GuardPlayground";

const NAV = [
  { id: "top", label: "Home" },
  { id: "how", label: "How it works" },
  { id: "playground", label: "Playground" },
  { id: "defences", label: "Defences" },
  { id: "limits", label: "Limits" },
];

const STEPS = [
  {
    n: "01",
    title: "A model reads something untrusted",
    body: "A file, a web page or an email can hide an instruction written for the AI. The model cannot reliably tell it apart from a real request.",
  },
  {
    n: "02",
    title: "It asks to use a tool",
    body: "Write a file. Read a system path. Call a tool nobody gave it. The model does not run these itself. It only asks.",
  },
  {
    n: "03",
    title: "The guard decides, not the model",
    body: "Every request passes through code that checks permissions, paths, arguments and history. The model's own opinion about what is safe is never part of the decision.",
  },
];

const DEFENCES = [
  ["Permissions per run", "A tool runs only if the policy grants everything it needs. Unknown tools are refused."],
  ["Sandboxed paths", "Paths are resolved first and judged by where they land. Dot-dot, absolute paths and symlinks all fail the same check."],
  ["Strict arguments", "Extra, missing or wrongly typed arguments are refused before the tool sees them."],
  ["Untrusted-data rule", "After reading data an attacker could control, anything with side effects needs approval. The default answer is no."],
  ["Call budget", "A run ends after a fixed number of calls. Refused calls count too, so a loop cannot probe forever."],
  ["Output limit", "Tool output is cut down before it goes back to the model."],
  ["Safe calculator", "Arithmetic is parsed by hand and never evaluated as code."],
  ["Audit log", "Every allow and every refusal is recorded with its reason. File contents are never copied into the log."],
];

const LIMITS = [
  "It does not detect prompt injection in text. It limits what an injected instruction can do.",
  "A tool that reads files still lets the model see everything inside the sandbox. Keep secrets out of it.",
  "The untrusted-data rule is coarse: after one risky read, every side-effect tool needs approval for the rest of the run.",
  "The model here is scripted. That makes every run repeatable, and it stands in for a model that has been tricked.",
  "This is a learning project, not a hardened product.",
];

const IDS = NAV.map((n) => n.id);

export default function App() {
  const progress = useScrollProgress();
  const active = useActiveSection(IDS);

  return (
    <>
      <a className="skip" href="#playground">Skip to the playground</a>
      <div className="progress" aria-hidden="true">
        <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Guard Playground, home">
          <span className="brand-mark" aria-hidden="true" />
          Guard Playground
        </a>
        <nav aria-label="Sections">
          {NAV.slice(1).map((n) => (
            <a key={n.id} href={`#${n.id}`} className={active === n.id ? "is-active" : ""} aria-current={active === n.id ? "location" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section id="top" className="hero">
          <div className="hero-copy hero-in-left">
            <p className="eyebrow">Secure AI agents · a live demo</p>
            <h1>
              Try to trick<br />
              an <span className="grad">AI agent</span>.
            </h1>
            <p className="lede">
              An AI that reads a file can be told what to do by whatever is hidden in it. This page lets you attack a
              simulated agent and watch a permission guard decide, step by step, what is allowed to happen.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#playground">Start attacking</a>
              <a className="btn ghost" href={REPO} target="_blank" rel="noreferrer">Read the guard’s code</a>
            </div>
          </div>
          <div className="hero-art hero-in-right">
            <ShieldArt />
          </div>
          <a className="scroll-cue" href="#how" aria-label="Scroll to how it works">
            <span>scroll</span>
            <i aria-hidden="true" />
          </a>
        </section>

        <section id="how" className="section">
          <Reveal from="left"><p className="eyebrow">How an attack works</p></Reveal>
          <Reveal from="right" delay={80}>
            <h2>Three steps, and the model only controls the first two.</h2>
          </Reveal>
          <div className="how-grid">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} from={i % 2 === 0 ? "left" : "right"} delay={i * 120} className="card how-card">
                <span className="num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="playground" className="section">
          <Reveal from="left"><p className="eyebrow">Playground</p></Reveal>
          <Reveal from="right" delay={80}>
            <h2>Break the rules, then see which one caught you.</h2>
          </Reveal>
          <Reveal from="up" delay={120} className="card play-card">
            <Playground />
          </Reveal>
        </section>

        <section id="defences" className="section">
          <Reveal from="left"><p className="eyebrow">What the guard enforces</p></Reveal>
          <Reveal from="right" delay={80}><h2>Eight small defences that stack.</h2></Reveal>
          <div className="def-grid">
            {DEFENCES.map(([title, body], i) => (
              <Reveal key={title} from={i % 2 === 0 ? "left" : "right"} delay={(i % 2) * 90} className="card def-card">
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="limits" className="section">
          <Reveal from="left"><p className="eyebrow">Being honest</p></Reveal>
          <Reveal from="right" delay={80}><h2>What this does not do.</h2></Reveal>
          <ul className="limits">
            {LIMITS.map((text, i) => (
              <Reveal key={text} as="li" from={i % 2 === 0 ? "left" : "right"} delay={i * 70}>
                {text}
              </Reveal>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <Reveal from="left" className="footer-inner">
          <div>
            <strong>Built by Muhammad Taha</strong>
            <span>CS student at FAST NUCES, Islamabad</span>
          </div>
          <div className="footer-links">
            <a href="https://github.com/Taha-1Git" target="_blank" rel="noreferrer">GitHub</a>
            <a href={REPO} target="_blank" rel="noreferrer">SecureAgent (Python)</a>
            <a href={SITE_REPO} target="_blank" rel="noreferrer">This site’s code</a>
          </div>
        </Reveal>
      </footer>
    </>
  );
}
