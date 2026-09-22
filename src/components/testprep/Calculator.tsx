import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The on-screen calculator, available in the Math modules only.
 *
 * It parses rather than evaluates. `eval` on a string a student typed is a
 * script-injection hole with no upside, and `new Function` is the same hole
 * wearing a hat — so this is a small recursive-descent parser over the
 * arithmetic the test actually needs: the four operations, powers, parentheses,
 * decimals, a square root and a negation.
 *
 * It is a calculator, not a CAS. The digital SAT's built-in tool does far more,
 * and a student who needs graphing should use the real thing; what matters here
 * is that arithmetic during a timed module does not send them to another tab.
 */
export function Calculator({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const push = (token: string) => {
    setExpr((e) => e + token);
    setResult(null);
  };

  const evaluate = () => {
    try {
      const value = parseExpression(expr);
      setResult(formatResult(value));
    } catch {
      setResult("Not a valid expression");
    }
  };

  const keys: { label: string; token?: string; action?: () => void; wide?: boolean }[] = [
    { label: "C", action: () => { setExpr(""); setResult(null); } },
    { label: "(", token: "(" },
    { label: ")", token: ")" },
    { label: "÷", token: "/" },
    { label: "7", token: "7" },
    { label: "8", token: "8" },
    { label: "9", token: "9" },
    { label: "×", token: "*" },
    { label: "4", token: "4" },
    { label: "5", token: "5" },
    { label: "6", token: "6" },
    { label: "−", token: "-" },
    { label: "1", token: "1" },
    { label: "2", token: "2" },
    { label: "3", token: "3" },
    { label: "+", token: "+" },
    { label: "0", token: "0" },
    { label: ".", token: "." },
    { label: "^", token: "^" },
    { label: "√", token: "sqrt(" },
  ];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      className="w-60 rounded-xl border border-border bg-popover p-3 shadow-xl"
      role="group"
      aria-label="Calculator"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Calculator
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <input
        value={expr}
        onChange={(e) => {
          setExpr(e.target.value);
          setResult(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") evaluate();
        }}
        aria-label="Expression"
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-right font-mono text-sm text-foreground outline-none focus:border-[hsl(var(--bb-blue))]"
      />
      <p
        className={cn(
          "mt-1 h-5 text-right font-mono text-sm tabular-nums",
          result === "Not a valid expression" ? "text-destructive" : "text-foreground",
        )}
      >
        {result ?? ""}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => (k.action ? k.action() : push(k.token ?? ""))}
            className="rounded-md border border-border py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            {k.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpr((e) => e.slice(0, -1))}
          className="rounded-md border border-border py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={evaluate}
          className="col-span-3 rounded-md bg-[hsl(var(--bb-blue))] py-1.5 text-sm font-medium text-[hsl(var(--bb-blue-foreground))] transition-opacity hover:opacity-90"
        >
          =
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* The parser                                                          */
/* ------------------------------------------------------------------ */

/**
 * expression := term (("+" | "-") term)*
 * term       := unary (("*" | "/") unary)*
 * unary      := "-" unary | power
 * power      := primary ("^" unary)?        — right associative
 * primary    := number | "(" expression ")" | "sqrt" "(" expression ")"
 *
 * Unary minus sits ABOVE exponentiation here, not below it. Written the other
 * way round — which is how this started — `-2^2` parses as `(-2)^2` and
 * returns 4. Mathematical notation, a TI-84, Desmos and Python all agree it
 * is `-(2^2)` and returns -4. A calculator that quietly disagrees with the
 * calculator a student will sit the real exam with is worse than no
 * calculator, because they have no reason to check it.
 *
 * `power` recursing into `unary` rather than itself is what keeps `2^-3`
 * working, and makes the whole chain right-associative as exponentiation
 * should be.
 */
function parseExpression(input: string): number {
  let i = 0;
  // Lowercased so "SQRT(9)" is the same as "sqrt(9)"; the keypad only ever
  // produces lower case, but the field accepts typing.
  const src = input.replace(/\s+/g, "").toLowerCase();

  const peek = () => src[i];
  const eat = (ch: string) => {
    if (src[i] !== ch) throw new Error(`expected ${ch}`);
    i += 1;
  };

  function expression(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = src[i];
      i += 1;
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function term(): number {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const op = src[i];
      i += 1;
      const rhs = unary();
      if (op === "/" && rhs === 0) throw new Error("divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  function unary(): number {
    if (peek() === "-") {
      i += 1;
      return -unary();
    }
    return power();
  }

  function power(): number {
    const base = primary();
    if (peek() === "^") {
      i += 1;
      // Into `unary`, not `power`, so `2^-3` is a thing you can type.
      return base ** unary();
    }
    return base;
  }

  function primary(): number {
    if (src.startsWith("sqrt(", i)) {
      i += 5;
      const value = expression();
      eat(")");
      if (value < 0) throw new Error("sqrt of negative");
      return Math.sqrt(value);
    }
    if (peek() === "(") {
      i += 1;
      const value = expression();
      eat(")");
      return value;
    }
    const match = /^\d*\.?\d+/.exec(src.slice(i));
    if (!match) throw new Error("expected a number");
    i += match[0].length;
    return Number(match[0]);
  }

  const value = expression();
  if (i !== src.length) throw new Error("trailing input");
  if (!Number.isFinite(value)) throw new Error("not finite");
  return value;
}

/** Trims floating-point noise without pretending to more precision than there is. */
function formatResult(value: number): string {
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}
