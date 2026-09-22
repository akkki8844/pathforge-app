import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  Copy,
  FileText,
  Loader2,
  Send,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { cn } from "@/lib/utils";

/**
 * The copilot.
 *
 * WHAT THIS PAGE USED TO BE
 *
 * It answered its own questions. A local `getAIResponse(query)` matched a few
 * keywords against the question and returned one of four hardcoded paragraphs
 * after a 1500ms `setTimeout` whose only job was to look like thinking. Asked
 * who was at risk, it replied "Based on your roster, here are the students
 * requiring immediate attention" and then listed three generic categories. It
 * had never read the roster and could not have: the page imported no data hook
 * at all. It then offered to draft outreach emails, which it also could not do.
 *
 * A counsellor who believed any of that was acting on nothing while being told
 * it came from their own cohort. So the canned replies are gone. The page now
 * calls `counsellor-copilot`, which assembles the caller's real roster, their
 * open follow-ups, the essays actually waiting on them and their upcoming
 * meetings, and answers only from that.
 *
 * Two consequences are deliberate and visible here:
 *
 *  - A counsellor with nobody linked to them is told so, by the function,
 *    before a credit is spent. There is no cohort to reason about and the page
 *    says that rather than producing advice-shaped text.
 *  - Answers name real students, so the reply carries a link to each one. The
 *    references come back resolved against the roster, not parsed out of the
 *    prose, which means a name the model invented resolves to nothing and
 *    never appears as a link.
 */

interface Reference {
  id: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Students this answer refers to, resolved server-side against the roster. */
  students?: Reference[];
  at: Date;
}

/**
 * The starting questions.
 *
 * Each one is answerable from the snapshot the function builds - roster with
 * scores and standing, open follow-ups, unread essays, upcoming meetings - so
 * none of them can produce an apology about missing data on a cohort that has
 * some. The old page's prompts included an essay quality check and a
 * university recommender, neither of which anything behind the page could do.
 */
const QUICK_PROMPTS = [
  {
    label: "Who is falling behind",
    icon: AlertTriangle,
    prompt:
      "Which students are marked behind, or have the lowest profile scores? For each, say what the score is and what you would look at first.",
  },
  {
    label: "What needs me this week",
    icon: Target,
    prompt:
      "Rank what needs my attention in the next seven days across open follow-ups, essays waiting on a review, and booked meetings. Name the student for each item.",
  },
  {
    label: "Essays waiting on me",
    icon: FileText,
    prompt:
      "List the essays waiting on my review, oldest first, with the student's name and how long each has been sitting.",
  },
  {
    label: "Prep my next meeting",
    icon: Calendar,
    prompt:
      "Take my next booked meeting. Tell me what the workspace knows about that student and what I should raise with them.",
  },
] as const;

export default function TeacherCopilot() {
  const { toast } = useToast();
  const { students, loading: rosterLoading } = useTeacherRoster();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const cohortLine = useMemo(() => {
    if (rosterLoading) return null;
    if (!students.length) return "No students linked to you yet";
    const behind = students.filter((s) => s.status === "behind").length;
    const noun = students.length === 1 ? "student" : "students";
    return behind
      ? `Reading ${students.length} ${noun}, ${behind} marked behind`
      : `Reading ${students.length} ${noun}`;
  }, [students, rosterLoading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;

    /*
     * The history sent up is the conversation before this question, which is
     * also the state the UI is about to leave behind. Reading it here rather
     * than from the post-append state keeps the two in step without a ref.
     */
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: question, at: new Date() }]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("counsellor-copilot", {
        body: { message: question, history },
      });

      /*
       * `invoke` reports any non-2xx as a generic FunctionsHttpError, so the
       * function's own message - out of credits, not verified, rate limited -
       * is only in the body. Read it before falling back to the generic text,
       * otherwise every failure reads the same to the counsellor.
       */
      const payload = data as
        | { answer?: string; students?: Reference[]; error?: string }
        | null;

      if (error || payload?.error) {
        const detail =
          payload?.error ??
          (await readFunctionError(error)) ??
          "The copilot could not answer that. Try again in a moment.";
        toast({ variant: "destructive", title: "Copilot", description: detail });
        // The question stays in the transcript; a failed answer does not get
        // written as one. Put the text back so it can be retried as typed.
        setMessages((prev) => prev.slice(0, -1));
        setInput(question);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: payload?.answer ?? "",
          students: payload?.students ?? [],
          at: new Date(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const copyAnswer = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1600);
    } catch {
      toast({ variant: "destructive", title: "Could not copy" });
    }
  };

  const empty = messages.length === 0;

  return (
    <TeacherLayout>
      <Seo
        title="Copilot"
        description="Ask about your own cohort's data."
        path="/teacher/copilot"
        noindex
      />

      <div className="flex h-[calc(100svh-9rem)] flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Copilot</h1>
            {/* What it is reading, stated before it is asked anything. The
                counsellor should never have to guess whether an answer covers
                their whole list. */}
            {cohortLine === null ? (
              <Skeleton className="mt-2 h-4 w-48" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {cohortLine}. It reads your roster, follow-ups, essay queue and booked
                meetings, and answers from those only.
              </p>
            )}
          </div>

          {!empty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="shrink-0 text-muted-foreground"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {empty && (
            <div className="mx-auto max-w-2xl py-6">
              <p className="text-[13px] font-medium text-muted-foreground">
                Start with one of these, or ask anything about your cohort.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    type="button"
                    onClick={() => send(qp.prompt)}
                    disabled={sending || (!rosterLoading && students.length === 0)}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/25 hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <qp.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {qp.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {!rosterLoading && students.length === 0 && (
                <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-[13px] leading-relaxed text-muted-foreground">
                  There is nothing to ask about yet. Students appear here once they join
                  one of your cohorts, which you can set up under{" "}
                  <Link to="/teacher/classes" className="underline underline-offset-2">
                    Cohorts
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          <div className="mx-auto max-w-2xl space-y-5 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("flex gap-3", msg.role === "user" && "justify-end")}
                >
                  {msg.role === "assistant" && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <Bot className="h-3.5 w-3.5 text-foreground" />
                    </span>
                  )}

                  <div
                    className={cn(
                      "min-w-0 max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-foreground text-background"
                        : "border border-border bg-card",
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="group/answer">
                        <div className="prose prose-sm max-w-none dark:prose-invert [&_li]:my-0.5 [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Every student the answer named, as a way into their
                            file. This is the difference between being told who
                            is behind and being able to go and do something
                            about it. */}
                        {!!msg.students?.length && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                            {msg.students.map((s) => (
                              <Link
                                key={s.id}
                                to={`/teacher/students/${s.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                              >
                                {s.name}
                                <ArrowUpRight className="h-3 w-3 opacity-60" />
                              </Link>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => copyAnswer(i, msg.content)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/answer:opacity-100"
                          aria-label="Copy this answer"
                        >
                          {copied === i ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <User className="h-3.5 w-3.5 text-foreground" />
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  <Bot className="h-3.5 w-3.5 text-foreground" />
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Reading your cohort</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 w-full max-w-2xl">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your cohort. Enter to send, Shift+Enter for a new line."
              rows={1}
              disabled={sending}
              className="max-h-40 min-h-[2.75rem] resize-none"
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Answers come from your workspace data and can still be wrong. Check anything
            you are about to act on against the student's file.
          </p>
        </div>
      </div>
    </TeacherLayout>
  );
}

/**
 * The function's own error message, dug out of a FunctionsHttpError.
 *
 * `supabase.functions.invoke` collapses every non-2xx into one error type
 * whose `message` is always "Edge Function returned a non-2xx status code".
 * The useful text is in the response body it carries, so pull that out before
 * showing the counsellor something that tells them nothing.
 */
async function readFunctionError(error: unknown): Promise<string | null> {
  const res = (error as { context?: Response })?.context;
  if (!res || typeof res.json !== "function") return null;
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}
