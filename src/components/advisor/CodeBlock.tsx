import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, WrapText } from "lucide-react";
import { highlight, languageLabel, type TokenClass } from "@/lib/highlight";
import { cn } from "@/lib/utils";

// Code gets its own surface rather than living inside the chat bubble: a header
// strip naming the language with a copy button, and a body that scrolls
// horizontally on its own so a long line can never widen the conversation.
//
// The surface stays dark in both themes. Code is the one place where a single
// palette beats theme-matching — the token colours below are tuned against this
// navy, and re-tuning them for the cream light theme would mean maintaining two
// sets that drift apart.

const TOKEN_STYLES: Record<TokenClass, string> = {
  comment: "text-slate-500 italic",
  string: "text-emerald-300",
  number: "text-amber-300",
  keyword: "text-violet-300",
  fn: "text-sky-300",
  var: "text-orange-300",
  tag: "text-rose-300",
  attr: "text-sky-200",
  plain: "text-slate-100",
};

export const CodeBlock = memo(function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const tokens = useMemo(() => highlight(code, lang), [code, lang]);
  // Long lines are the only case where wrapping is worth offering, so the
  // toggle stays hidden otherwise instead of adding permanent chrome.
  const hasLongLine = useMemo(
    () => code.split("\n").some((l) => l.length > 88),
    [code],
  );

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (insecure context, denied permission) — the text is
         still selectable, so failing quietly beats an error toast here. */
    }
  }, [code]);

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1526] shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-1.5">
        <span className="font-display text-[11px] uppercase tracking-[0.14em] text-slate-400">
          {languageLabel(lang)}
        </span>
        <div className="flex items-center gap-1">
          {hasLongLine && (
            <button
              type="button"
              onClick={() => setWrap((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                wrap
                  ? "bg-white/10 text-slate-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
              aria-pressed={wrap}
              title={wrap ? "Don't wrap lines" : "Wrap lines"}
            >
              <WrapText className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre
        className={cn(
          "m-0 max-h-[32rem] overflow-auto bg-transparent px-4 py-3 text-[12.5px] leading-[1.65]",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        <code className="font-mono">
          {tokens.map((t, i) => (
            <span key={i} className={TOKEN_STYLES[t.cls]}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
});

/**
 * `components` map for ReactMarkdown. Fenced blocks arrive as `<pre><code>`;
 * react-markdown nests the `code` element inside `pre`, so `pre` is unwrapped
 * to a fragment and the real rendering happens in `code` — otherwise the styled
 * block would sit inside a second, unstyled `<pre>`.
 */
export const markdownCodeComponents = {
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  code: ({ className, children, ...props }: any) => {
    const raw = String(children ?? "");
    const match = /language-(\w+)/.exec(className ?? "");

    // Inline code: no language class and no newline. Kept as a subtle chip so
    // `--flag` or a file path reads as code without becoming a whole block.
    if (!match && !raw.includes("\n")) {
      return (
        <code
          className="rounded-[5px] border border-border/60 bg-muted px-[0.35em] py-[0.12em] font-mono text-[0.87em] text-foreground before:content-none after:content-none"
          {...props}
        >
          {children}
        </code>
      );
    }

    // Trailing newline is an artefact of the fence, not part of the code.
    return <CodeBlock code={raw.replace(/\n$/, "")} lang={match?.[1] ?? null} />;
  },
};
