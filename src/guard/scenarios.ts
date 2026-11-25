import type { Scenario } from "./types";

export const SCENARIOS: Scenario[] = [
  {
    id: "injection",
    title: "Hidden instruction in a file",
    blurb:
      "The notes file hides a command aimed at the AI. The model obeys it and tries to write a file and read a system file.",
    task: "Summarise notes.txt",
    steps: [
      { name: "read_file", args: { path: "notes.txt" } },
      { name: "write_file", args: { path: "pwned.txt", content: "stolen data" } },
      { name: "read_file", args: { path: "../../etc/passwd" } },
      { name: "calculator", args: { expression: "6 * 7" } },
    ],
  },
  {
    id: "traversal",
    title: "Path traversal",
    blurb:
      "Four ways to reach outside the sandbox: dot-dot, an absolute path, a Windows path, and a symlink that points out.",
    task: "Open some files",
    steps: [
      { name: "read_file", args: { path: "../secrets.txt" } },
      { name: "read_file", args: { path: "/etc/passwd" } },
      { name: "read_file", args: { path: "C:\\Windows\\win.ini" } },
      { name: "read_file", args: { path: "shortcut/passwd" } },
      { name: "read_file", args: { path: "./report.md" } },
    ],
  },
  {
    id: "permissions",
    title: "A tool you never granted",
    blurb:
      "This run only has read access. The model asks to write, to delete, and to call a tool that does not exist.",
    task: "Tidy the report",
    policy: { granted: ["fs.read", "compute"] },
    steps: [
      { name: "read_file", args: { path: "report.md" } },
      { name: "write_file", args: { path: "report.md", content: "# rewritten" } },
      { name: "delete_everything", args: {} },
      { name: "list_dir", args: { path: "." } },
    ],
  },
  {
    id: "loop",
    title: "Runaway loop",
    blurb:
      "A confused model keeps calling the same tool. The call budget ends the run instead of letting it spin forever.",
    task: "Add up some numbers",
    policy: { maxCalls: 4 },
    steps: Array.from({ length: 9 }, (_, i) => ({
      name: "calculator",
      args: { expression: `${i + 1} + ${i + 1}` },
    })),
  },
  {
    id: "calculator",
    title: "Code in the calculator",
    blurb:
      "The calculator parses arithmetic by hand. Anything that looks like code is just a syntax error, never executed.",
    task: "Work out a few sums",
    steps: [
      { name: "calculator", args: { expression: "2 + 3 * 4" } },
      { name: "calculator", args: { expression: "__import__('os').system('id')" } },
      { name: "calculator", args: { expression: "2 ** 100000" } },
      { name: "calculator", args: { expression: "1 / 0" } },
      { name: "calculator", args: { expression: "constructor.constructor('return 1')()" } },
    ],
  },
];
