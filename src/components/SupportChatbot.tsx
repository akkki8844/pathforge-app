import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PromptGlow } from "@/components/ui/prompt-glow";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SupportChatbot() {
  const { refreshOnboardingData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      // Two lines. The previous greeting spent a bulleted menu and a caveat
      // explaining itself before the student had asked anything, which is a lot
      // of reading to do before typing one sentence and none of it is needed to
      // start. What it can and cannot do is better demonstrated in the first
      // answer than promised in the first message.
      content: "Hey — support here. What's not working, or what are you trying to figure out?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          message: trimmedInput,
          history: messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0),
        },
      });

      if (error) {
        console.error("Chat error:", error);
        if (error.message?.includes("429")) {
          toast.error("Too many requests. Please wait a moment.");
        } else {
          toast.error("Couldn't reach support. Try again!");
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again in a moment!" },
        ]);
        return;
      }

      if (data?.reply) {
        if (data?.action?.type === "update_major") {
          await refreshOnboardingData();
          toast.success(`Major updated to ${data.action.value}.`);
        }
        // Support chat is free — the support-chat function never calls
        // consume_credit, so firing the credit-consumed event here only
        // played the burn animation and made users think they'd been charged
        // for asking for help.
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
      }
    } catch (err) {
      console.error("Support chat error:", err);
      setMessages((prev) => [
        ...prev,
          { role: "assistant", content: "I couldn't fix that directly. Please email **support@pathforge.co.in** with the issue and it will be fixed within 8 hours." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button — small white pill, docked next to Feedback (which
          sits just to its left). See FeedbackWidget for the paired position. */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 h-11 w-11 rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/10 flex items-center justify-center hover:shadow-xl transition-shadow"
            aria-label="Open support chat"
            title="Support"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl h-[70svh] max-h-[calc(100dvh-6rem)] sm:h-[600px] sm:w-[480px] lg:w-[560px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Pathforge Support</h3>
                  <p className="text-xs text-muted-foreground">Here to help!</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-accent" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      message.role === "user"
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-accent" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background/50">
              {/* `group` and `isolate` are what PromptGlow needs from its host:
                  the first drives the hover and focus rims, the second keeps the
                  overlay's negative z-index inside this box. */}
              <div className="group relative isolate flex gap-2 rounded-xl">
                <PromptGlow radius="rounded-xl" intensity={0.5} />
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="min-h-[44px] max-h-[100px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-[44px] w-[44px] bg-accent hover:bg-accent/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
