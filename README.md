# Guard Playground

**Try to trick an AI agent, and watch a permission guard decide what is allowed to happen.**

An AI that reads a file can be told what to do by whatever is hidden inside it. This site lets you attack a simulated agent and see, step by step, which defence caught you.

Live demo: https://taha-1git.github.io/GuardPlayground/

## What you can do

- Pick an attack: a hidden instruction in a file, path traversal, a tool the run was never granted, a runaway loop, or code smuggled into a calculator.
- Change the rules: which permissions the run has, the call budget, and whether a human must approve writes after untrusted reads.
- Add your own steps, such as `read_file("../../etc/passwd")`, and see exactly why they are blocked.
- Switch on "the human clicks approve" to see how a tricked human lets an attack through.

Everything runs in your browser. There is no server, no API key and no real file access: the files are a small virtual sandbox.

## How it works

The "model" is scripted. It stands in for a model that has been tricked, which makes every run repeatable. Each request it makes passes through a guard that looks only at the call, the tool's declaration and the policy. It never trusts what the model says about itself.

| Defence | What it stops |
| --- | --- |
| Permissions per run | Tools the policy did not grant, and tools that do not exist |
| Sandboxed paths | `..`, absolute paths, Windows paths and symlinks that point outside |
| Strict arguments | Extra, missing or wrongly typed arguments |
| Untrusted-data rule | Writes that follow a read of attacker-controlled data, unless a human approves |
| Call budget | Runaway loops. Refused calls count too |
| Output limit | Very long tool output going back to the model |
| Safe calculator | Code in an expression. It is parsed by hand, never evaluated |

The guard logic lives in `src/guard/` and has no dependency on React, so it is tested on its own.

This is the browser version of [SecureAgent](https://github.com/Taha-1Git/SecureAgent), the Python project it was ported from.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 48 unit tests for the guard
npm run build    # type-checks, then builds to dist/
```

## Front-end details

- React 18, TypeScript (strict) and Vite. No UI library and no animation library.
- Sections slide in from the left and right as you scroll, driven by `IntersectionObserver` and CSS transitions only.
- A scroll progress bar and an active-section highlight in the nav.
- Respects `prefers-reduced-motion`: with it on, everything is simply visible and nothing slides.
- Keyboard accessible, with a skip link, visible focus rings and live-region announcements for results.
- Responsive down to phone width with no horizontal scrolling.

## Project layout

```
src/
  guard/       policy checks, virtual sandbox, safe calculator, scenarios, tests
  components/  Playground, Reveal (slide-in on scroll), ShieldArt
  hooks.ts     useReveal, useScrollProgress, useActiveSection
  styles.css
```

## Limits

- It does not detect prompt injection in text. It limits what an injected instruction can do.
- The untrusted-data rule is coarse: after one risky read, every side-effect tool needs approval for the rest of the run.
- It is a learning project, not a hardened product.

## Author

**Muhammad Taha** ([@Taha-1Git](https://github.com/Taha-1Git))

## License

MIT
