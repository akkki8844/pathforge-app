import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot, Send, Sparkles, User, FileText, Users, GraduationCap,
  AlertTriangle, Calendar, Target, Loader2,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "Summarize at-risk students", icon: AlertTriangle, prompt: "Give me a summary of all students who are at risk or falling behind, with specific concerns for each." },
  { label: "Draft meeting agenda", icon: Calendar, prompt: "Help me draft a meeting agenda for my next counseling session with a student who needs help with college list finalization." },
  { label: "Suggest next actions", icon: Target, prompt: "What are the top 5 most important actions I should take this week for my students?" },
  { label: "Find missing documents", icon: FileText, prompt: "Which students have missing documents or incomplete application materials?" },
  { label: "Essay quality check", icon: Sparkles, prompt: "Review the recent essay submissions and flag any that need immediate attention." },
  { label: "University recommendations", icon: GraduationCap, prompt: "Suggest universities for students who haven't finalized their college lists yet, based on their profiles." },
];

export default function TeacherCopilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate AI response (in production, this would call an edge function)
    setTimeout(() => {
      const response = getAIResponse(text);
      setMessages((prev) => [...prev, { role: "assistant", content: response, timestamp: new Date() }]);
      setLoading(false);
    }, 1500);
  };

  const getAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes("at risk") || q.includes("behind")) {
      return "Based on your roster, here are the students requiring immediate attention:\n\n1. **Students with declining scores** — Review their journey scores and identify specific weak areas.\n2. **Inactive students** — Students who haven't logged in recently may need a check-in email.\n3. **Upcoming deadlines** — Prioritize students with application deadlines in the next 2 weeks.\n\nWould you like me to draft outreach emails for any of these students?";
    }
    if (q.includes("meeting") || q.includes("agenda")) {
      return "Here's a suggested meeting agenda:\n\n1. **Check-in** (5 min) — How are you feeling about the process?\n2. **Progress review** (10 min) — Review completed tasks and milestones\n3. **College list** (10 min) — Discuss target/reach/safety schools\n4. **Action items** (5 min) — Set clear next steps with deadlines\n5. **Questions** (5 min) — Address any concerns\n\nShall I customize this for a specific student?";
    }
    if (q.includes("document") || q.includes("missing")) {
      return "I'll scan your students' profiles for missing documents. Common gaps include:\n\n- **Transcripts** — Not yet uploaded\n- **Recommendation letters** — Requested but not received\n- **Test scores** — SAT/ACT/IELTS not reported\n- **Essays** — Drafts not started\n\nCheck the individual student profiles for specific missing items. Would you like me to send reminders?";
    }
    return "I can help you with:\n\n- **Student summaries** — Get quick overviews of your roster\n- **Meeting preparation** — Draft agendas and talking points\n- **Action planning** — Identify priority tasks\n- **Document tracking** — Find missing materials\n- **Essay review** — Flag essays needing attention\n- **University matching** — Suggest colleges based on student profiles\n\nWhat would you like to focus on?";
  };

  return (
    <TeacherLayout>
      <div className="flex flex-col h-[calc(100svh-8rem)]">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-accent" />
            AI Copilot
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your intelligent assistant for student management</p>
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-all text-left"
              >
                <qp.icon className="h-4 w-4 text-accent shrink-0" />
                <span className="text-sm text-foreground">{qp.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] p-3 rounded-xl text-sm",
                msg.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted border border-border"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={cn(
                  "text-[10px] mt-2",
                  msg.role === "user" ? "text-accent-foreground/60" : "text-muted-foreground"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-accent-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-muted border border-border p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about your students, request summaries, draft emails..."
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TeacherLayout>
  );
}
