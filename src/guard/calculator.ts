import { ToolError } from "./sandbox";

/**
 * Arithmetic only. The expression is parsed by hand, never passed to eval(),
 * so "code" in it is just a syntax error.
 */

const MAX_LENGTH = 200;

type Token = { kind: "num"; value: number } | { kind: "op"; value: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j])) j++;
      const raw = text.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new ToolError("could not parse expression");
      tokens.push({ kind: "num", value: Number(raw) });
      i = j;
    } else if (text.startsWith("**", i)) {
      tokens.push({ kind: "op", value: "**" });
      i += 2;
    } else if (text.startsWith("//", i)) {
      tokens.push({ kind: "op", value: "//" });
      i += 2;
    } else if ("+-*/%()".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i++;
    } else {
      throw new ToolError("expression not allowed");
    }
  }
  return tokens;
}

export function calculate(expression: unknown): string {
  if (typeof expression !== "string") throw new ToolError("could not parse expression");
  if (expression.length > MAX_LENGTH) throw new ToolError("expression too long");

  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos];
  const takeOp = (v: string) => {
    const t = peek();
    if (t && t.kind === "op" && t.value === v) {
      pos++;
      return true;
    }
    return false;
  };

  function primary(): number {
    const t = peek();
    if (!t) throw new ToolError("could not parse expression");
    if (t.kind === "num") {
      pos++;
      return t.value;
    }
    if (takeOp("(")) {
      const v = sum();
      if (!takeOp(")")) throw new ToolError("could not parse expression");
      return v;
    }
    throw new ToolError("could not parse expression");
  }

  function unary(): number {
    if (takeOp("-")) return -unary();
    if (takeOp("+")) return unary();
    return power();
  }

  function power(): number {
    const base = primary();
    if (takeOp("**")) {
      const exponent = unary();
      if (!(exponent >= 0 && exponent <= 10 && Math.abs(base) <= 1_000_000)) {
        throw new ToolError("exponent out of range");
      }
      return base ** exponent;
    }
    return base;
  }

  function product(): number {
    let left = unary();
    for (;;) {
      if (takeOp("*")) left *= unary();
      else if (takeOp("/")) left = divide(left, unary());
      else if (takeOp("//")) left = Math.floor(divide(left, unary()));
      else if (takeOp("%")) left = modulo(left, unary());
      else return left;
    }
  }

  function sum(): number {
    let left = product();
    for (;;) {
      if (takeOp("+")) left += product();
      else if (takeOp("-")) left -= product();
      else return left;
    }
  }

  const result = sum();
  if (pos !== tokens.length) throw new ToolError("could not parse expression");
  return String(parseFloat(result.toPrecision(12)));
}

function divide(a: number, b: number): number {
  if (b === 0) throw new ToolError("division by zero");
  return a / b;
}

function modulo(a: number, b: number): number {
  if (b === 0) throw new ToolError("division by zero");
  return a % b;
}
