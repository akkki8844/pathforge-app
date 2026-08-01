import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifyCreditConsumed } from '@/hooks/useCredits';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Mic,
  Loader2,
  Send,
  Plus,
  MessageSquare,
  Pencil,
  Check,
  X,
  Volume2,
  VolumeX,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Download,
  MoreHorizontal,
  FileBox,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Trash2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { usePlanTier } from '@/hooks/usePlanTier';
import { planForTier, type PlanTier } from '@/lib/plans';
import { useAdvisorHistory } from '@/hooks/useAdvisorHistory';
import { useAdvisorArtifacts } from '@/hooks/useAdvisorArtifacts';
import { useAdvisorSettings, type AdvisorSettings } from '@/hooks/useAdvisorSettings';
import { FileUploadButton } from '@/components/advisor/FileUploadButton';
import { AttachmentChips, type Attachment } from '@/components/advisor/AttachmentChips';
import { ArtifactsPanel } from '@/components/advisor/ArtifactsPanel';
import { ingestFile } from '@/lib/advisorUploads';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Seo } from "@/components/Seo";
import { useKeepAlive } from "@/components/KeepAliveProvider";

type LimitKind = 'credits' | 'rate' | null;

interface Message {
  role: 'user' | 'advisor';
  text: string;
  timestamp: Date;
}

const STARTER_PROMPTS = [
  { title: 'Plan my next semester', subtitle: 'What courses should I take to strengthen my profile?' },
  { title: 'Build my activity list', subtitle: 'Which extracurriculars best match my major?' },
  { title: 'Sharpen my essay topic', subtitle: 'Help me find a story that stands out.' },
  { title: 'Pick target colleges', subtitle: 'What schools fit my profile and goals?' },
];

// Model tiers ladder up with plan tier: Core is free, Pro needs the Pro plan,
// Max needs the Max plan. (The label is cosmetic — the same underlying model
// answers — but access is gated so the tiers mean something.)
const MODEL_OPTIONS = [
  { id: 'core', label: 'Pathforge Core', blurb: 'Balanced everyday advising', requiredPlan: 'free' as PlanTier },
  { id: 'pro', label: 'Pathforge Pro', blurb: 'Deeper analysis for tough calls', requiredPlan: 'pro' as PlanTier },
  { id: 'max', label: 'Pathforge Max', blurb: 'Top reasoning for high-stakes calls', requiredPlan: 'max' as PlanTier },
] as const;

// Effort is real: it writes reasoning_effort to advisor_settings, which the
// voice-advisor edge function forwards to the model as reasoning.effort.
const EFFORT_OPTIONS = [
  { id: 'none', label: 'Instant', blurb: 'Fastest — no extra reasoning' },
  { id: 'low', label: 'Low', blurb: 'A little thinking before replying' },
  { id: 'medium', label: 'Balanced', blurb: 'More careful, still snappy' },
  { id: 'high', label: 'Deep', blurb: 'Most thorough — best for hard problems' },
] as const;

const THINKING_KEYWORDS = [
  'Tinkering',
  'Discombobulating',
  'Calibrating',
  'Triangulating',
  'Untangling',
  'Synthesizing',
  'Cross-checking',
  'Pressure-testing',
  'Refining',
];

function cleanSpeechInput(raw: string): string {
  if (!raw) return raw;
  let text = raw;
  const fillers = ['uh', 'uhh', 'uhhh', 'um', 'umm', 'er', 'erm', 'ah', 'hmm', 'mhm', 'mm'];
  const sorted = [...fillers].sort((a, b) => b.length - a.length);
  for (const f of sorted) {
    text = text.replace(new RegExp(`\\b${f}\\b[,.\\s]*`, 'gi'), ' ');
  }
  text = text.replace(/\b(\w+)(?:\s+\1\b){1,}/gi, '$1');
  text = text.replace(/\s+/g, ' ').trim();
  return text || raw;
}

type ConvLite = { id: string; conversation_id: string; name: string; created_at: string; messages: { role: 'user' | 'advisor'; text: string; timestamp: string }[] };

function groupByDate<T extends { created_at: string }>(conversations: T[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000;

  const groups: Record<string, typeof conversations> = {
    Today: [],
    'Previous 7 days': [],
    'Previous 30 days': [],
    Older: [],
  };

  for (const c of conversations) {
    const t = new Date(c.created_at).getTime();
    if (t >= today) groups.Today.push(c);
    else if (t >= weekAgo) groups['Previous 7 days'].push(c);
    else if (t >= monthAgo) groups['Previous 30 days'].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

export default function Advisor() {
  const { user, onboardingData, profile, refreshOnboardingData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, archivedConversations, refreshSessions, renameConversation, saveMessage, exportConversation, projects, createProject, renameProject, deleteProject, setConversationProject, togglePin, archiveConversation } = useAdvisorHistory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Scope the app-wide keep-alive stack (audio context + worker heartbeat)
  // to only run while a message is actually being generated.
  useKeepAlive(isProcessing);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [limitHit, setLimitHit] = useState<LimitKind>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  // One keyword is chosen per response and held for the whole response — it
  // never rotates mid-answer. `thinkingSeconds` ticks alongside it.
  const [thinkingWord, setThinkingWord] = useState<string>(THINKING_KEYWORDS[0]);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingCursorRef = useRef(Math.floor(Math.random() * THINKING_KEYWORDS.length));
  const prefersReducedMotion = useReducedMotion();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Clickable follow-ups the advisor proposes, shown above the composer.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const { artifacts, refresh: refreshArtifacts } = useAdvisorArtifacts(currentConversationId);

  // Effort is persisted server-side and actually changes the model's reasoning;
  // model is a cosmetic label kept only in the browser.
  const { settings: advisorSettings, save: saveAdvisorSettings } = useAdvisorSettings();
  const [modelId, setModelId] = useState<string>(
    () => (typeof window !== 'undefined' && localStorage.getItem('pf_advisor_model')) || 'core'
  );
  const { has: hasPlan } = usePlanTier();
  // Never leave a gated model selected (e.g. a lapsed subscription): fall back
  // to the best model the user can actually access.
  const rawModel = MODEL_OPTIONS.find((m) => m.id === modelId) ?? MODEL_OPTIONS[0];
  const activeModel = hasPlan(rawModel.requiredPlan) ? rawModel : MODEL_OPTIONS[0];
  const activeEffort =
    EFFORT_OPTIONS.find((e) => e.id === advisorSettings.reasoning_effort) ?? EFFORT_OPTIONS[0];

  const selectModel = useCallback((id: string) => {
    const m = MODEL_OPTIONS.find((o) => o.id === id) ?? MODEL_OPTIONS[0];
    if (!hasPlan(m.requiredPlan)) {
      const plan = planForTier(m.requiredPlan);
      toast({
        title: `${m.label} is a ${plan.name}-plan feature`,
        description: `Upgrade to ${plan.name} ($${plan.priceUSD}/mo) to unlock ${m.label}.`,
        action: (
          <ToastAction altText="Upgrade" onClick={() => navigate('/pricing')}>
            Upgrade
          </ToastAction>
        ),
      });
      return;
    }
    setModelId(id);
    if (typeof window !== 'undefined') localStorage.setItem('pf_advisor_model', id);
  }, [hasPlan, navigate, toast]);

  const selectEffort = useCallback(
    (id: AdvisorSettings['reasoning_effort']) => {
      saveAdvisorSettings({ reasoning_effort: id }).catch(() => {
        toast({ variant: 'destructive', title: "Couldn't update effort", description: 'Please try again.' });
      });
    },
    [saveAdvisorSettings, toast]
  );
  const lastArtifactIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (artifacts.length === 0) return;
    const latest = artifacts[0];
    if (lastArtifactIdRef.current && lastArtifactIdRef.current !== latest.id) {
      setArtifactsOpen(true);
    }
    lastArtifactIdRef.current = latest.id;
  }, [artifacts]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in to attach files' });
      return;
    }
    const placeholders: Attachment[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      mime: f.type,
      kind: 'other',
      status: 'uploading',
    }));
    setAttachments((prev) => [...prev, ...placeholders]);
    await Promise.all(
      files.map(async (f, i) => {
        const ph = placeholders[i];
        try {
          const result = await ingestFile(f, user.id);
          setAttachments((prev) => prev.map((a) => (a.id === ph.id ? { ...result, id: ph.id } : a)));
        } catch (err) {
          setAttachments((prev) =>
            prev.map((a) => (a.id === ph.id ? { ...a, status: 'error', error: (err as Error).message } : a)),
          );
        }
      }),
    );
  }, [user, toast]);

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Runs only on the false→true edge (the early return covers the other one),
  // so the word is picked once per response and then held. Round-robin from a
  // random start: no repeats back-to-back, no bias toward the first keyword.
  useEffect(() => {
    if (!isProcessing) return;
    setThinkingWord(THINKING_KEYWORDS[thinkingCursorRef.current % THINKING_KEYWORDS.length]);
    thinkingCursorRef.current += 1;
    setThinkingSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [textInput]);

  // Speech recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalBuffer = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      finalBuffer = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalBuffer += t;
        else interim += t;
      }
      const live = (finalBuffer || interim).trim();
      if (live) setTextInput(live);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Microphone blocked',
          description: 'Allow microphone access in your browser, then try again.',
        });
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
    };
  }, [toast]);

  const startListening = useCallback(async () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current?.abort();
      await new Promise((r) => setTimeout(r, 80));
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Microphone access required',
        description: 'Please allow microphone access to use voice input.',
      });
    }
  }, [isSpeaking, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speakResponse = useCallback(
    (text: string) => {
      if (!audioEnabled) return;
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/\*+/g, '')
        .replace(/#+\s*/g, '')
        .replace(/`+/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [audioEnabled]
  );

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = useCallback(
    async (raw: string, fromVoice = false) => {
      const cleaned = fromVoice ? cleanSpeechInput(raw) : raw.trim();
      if ((!cleaned && attachments.length === 0) || isProcessing) return;

      if (isListening) stopListening();
      setIsProcessing(true);
      setLimitHit(null);
      setTextInput('');
      // Stale chips belong to the previous answer — clear before the new one.
      setSuggestions([]);

      const readyAttachments = attachments.filter((a) => a.status === 'ready');
      const attachmentsPayload = readyAttachments.map((a) => ({
        name: a.name,
        mime: a.mime,
        kind: a.kind,
        summary: a.summary,
        extractedText: a.extractedText,
        dataUrl: a.kind === 'image' ? a.dataUrl : undefined,
      }));
      setAttachments([]);

      const displayText = cleaned || (readyAttachments.length ? `(Sent ${readyAttachments.length} attachment${readyAttachments.length > 1 ? 's' : ''})` : '');
      const userMsg: Message = { role: 'user', text: displayText, timestamp: new Date() };
      const newHistory = [...messagesRef.current, userMsg];
      setMessages(newHistory);

      const isFirstInConversation = !currentConversationId;

      try {
        let data: any = null;
        let errorPayload: { code?: string; message?: string; status?: number } | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          const result = await supabase.functions.invoke('voice-advisor', {
            body: {
              message: cleaned || 'Please review the attached files.',
              onboardingData: {
                ...(onboardingData || {}),
                full_name: profile?.full_name || null,
                current_page: 'Advisor',
              },
              conversationHistory: newHistory.slice(-10),
              generateTitle: isFirstInConversation,
              attachments: attachmentsPayload,
              conversationId: currentConversationId,
              language: (typeof window !== "undefined" && localStorage.getItem("pf_language")) || "en",
            },
          });

          if (!result.error) {
            data = result.data;
            errorPayload = null;
            break;
          }

          // Try to parse the error body returned by the edge function
          let parsed: any = null;
          let status: number | undefined;
          try {
            const ctx: any = (result.error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              parsed = await ctx.json();
              status = ctx.status;
            } else if (ctx && typeof ctx.text === 'function') {
              const txt = await ctx.text();
              try { parsed = JSON.parse(txt); } catch { /* ignore */ }
              status = ctx.status;
            }
          } catch { /* ignore */ }

          errorPayload = {
            code: parsed?.error,
            message: parsed?.message || parsed?.error || result.error.message,
            status,
          };

          // Don't retry on client errors (4xx) — credit/rate/validation
          if (status && status >= 400 && status < 500) break;
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!data) {
          // Refresh credit meter so the badge updates immediately
          notifyCreditConsumed();

          if (errorPayload?.code === 'OUT_OF_CREDITS' || errorPayload?.status === 402) {
            setLimitHit('credits');
            // Remove the optimistic user message — we'll show an upgrade card instead
            setMessages((prev) => prev.slice(0, -1));
            return;
          }
          if (errorPayload?.code === 'RATE_LIMITED' || errorPayload?.status === 429) {
            setLimitHit('rate');
            setMessages((prev) => prev.slice(0, -1));
            return;
          }

          toast({
            variant: 'destructive',
            title: 'Advisor unreachable',
            description:
              errorPayload?.message ||
              'We could not reach the advisor. Please try again in a moment.',
          });
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        const advisorResponse = data?.response || "I'm having trouble processing that. Could you try again?";
        notifyCreditConsumed();
        if (data?.action?.type === 'update_major') {
          void refreshOnboardingData();
          toast({ title: 'Major updated', description: `Your intended major is now ${data.action.value}.` });
        }
        const advisorMsg: Message = { role: 'advisor', text: advisorResponse, timestamp: new Date() };
        setMessages((prev) => [...prev, advisorMsg]);

        // Follow-up chips for the composer. Defensive filter in case an older
        // deployment of the edge function hasn't shipped the field yet.
        setSuggestions(
          Array.isArray(data?.suggestions)
            ? data.suggestions.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
            : []
        );

        if (data?.artifact) {
          // Force-refresh and open the artifacts panel so the new doc shows up
          // immediately, even if realtime hasn't fired yet.
          void refreshArtifacts();
          setArtifactsOpen(true);
        }

        if (audioEnabled) speakResponse(advisorResponse);

        if (user) {
          // Fire-and-forget persistence — don't block UI on DB write
          void saveMessage(
            cleaned,
            advisorResponse,
            currentConversationId || undefined,
            data?.topics || [],
            data?.title || null,
          ).then((savedId) => {
            if (savedId && !currentConversationId) setCurrentConversationId(savedId);
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Unexpected error',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      isListening,
      stopListening,
      onboardingData,
      profile,
      user,
      speakResponse,
      audioEnabled,
      toast,
      currentConversationId,
      saveMessage,
      refreshOnboardingData,
      attachments,
      refreshArtifacts,
    ]
  );

  // Auto-send a prefilled prompt when arriving from another page (e.g. Activities "Ask Advisor")
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const prompt = searchParams.get('prompt');
    if (!prompt || isProcessing) return;
    autoSentRef.current = true;
    // Clear the param from the URL so a refresh won't re-send
    const next = new URLSearchParams(searchParams);
    next.delete('prompt');
    setSearchParams(next, { replace: true });
    sendMessage(prompt);
  }, [searchParams, setSearchParams, sendMessage, isProcessing]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (textInput.trim() || attachments.some((a) => a.status === 'ready')) {
      sendMessage(textInput.trim(), isListening);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setTextInput('');
    setLimitHit(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const loadConversation = (conv: typeof conversations[0]) => {
    setMessages(
      conv.messages.map((m) => ({
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp),
      }))
    );
    setCurrentConversationId(conv.conversation_id);
    setLimitHit(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleRename = async (convId: string) => {
    if (!editName.trim()) return;
    await renameConversation(convId, editName.trim());
    setEditingConvId(null);
    setEditName('');
  };

  const pinned = useMemo(() => conversations.filter((c) => c.pinned), [conversations]);
  const projectMap = useMemo(() => {
    const m = new Map<string, typeof conversations>();
    for (const p of projects) m.set(p.id, []);
    for (const c of conversations) {
      if (c.pinned) continue;
      if (c.project_id && m.has(c.project_id)) m.get(c.project_id)!.push(c);
    }
    return m;
  }, [conversations, projects]);
  const unassigned = useMemo(
    () => conversations.filter((c) => !c.pinned && !c.project_id),
    [conversations],
  );
  const grouped = useMemo(() => groupByDate(unassigned), [unassigned]);

  return (
    <div className="flex bg-background h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
      <Seo title='Voice & chat AI advisor | Pathforge' description='Talk or chat with your Pathforge AI advisor for instant, personalized college application guidance.' path='/advisor' />
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 top-16 z-30 bg-background/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -288, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -288, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'flex w-72 flex-col border-r border-border bg-card/60 backdrop-blur-md',
              'fixed md:static top-16 bottom-0 left-0 z-40 md:z-auto md:h-auto'
            )}
          >
            <div className="p-3 border-b border-border space-y-2">
              <Button
                onClick={startNewChat}
                className="w-full justify-start gap-2 h-10 font-medium"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              <Button
                onClick={() => { setNewProjectName(''); setNewProjectOpen(true); }}
                className="w-full justify-start gap-2 h-9 text-xs"
                variant="ghost"
              >
                <FileBox className="h-3.5 w-3.5" />
                New project
              </Button>
              {/* Delete/clear-all is intentionally removed — use Archive from each conversation instead. */}
            </div>
            <ScrollArea className="flex-1 px-2 py-3">
              {(() => {
                const renderConv = (conv: typeof conversations[number]) => {
                  const isActive = conv.conversation_id === currentConversationId;
                  const isEditing = editingConvId === conv.conversation_id;
                  return (
                    <div
                      key={conv.conversation_id}
                      className={cn(
                        'group relative rounded-lg transition-colors',
                        isActive ? 'bg-secondary' : 'hover:bg-secondary/50'
                      )}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1 p-1.5">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(conv.conversation_id);
                              if (e.key === 'Escape') setEditingConvId(null);
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleRename(conv.conversation_id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingConvId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center group/row">
                          <button
                            onClick={() => loadConversation(conv)}
                            className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left"
                          >
                            {conv.pinned ? (
                              <Zap className="h-3.5 w-3.5 shrink-0 text-accent fill-accent" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="flex-1 truncate text-sm">{conv.name}</span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="opacity-0 group-hover/row:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 mr-1.5 rounded hover:bg-background focus:outline-none"
                                aria-label="Conversation options"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => togglePin(conv.conversation_id, !conv.pinned)} className="gap-2 text-xs">
                                <Zap className="h-3.5 w-3.5" />
                                {conv.pinned ? 'Unpin' : 'Pin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingConvId(conv.conversation_id); setEditName(conv.name); }} className="gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportConversation(conv.conversation_id)} className="gap-2 text-xs">
                                <Download className="h-3.5 w-3.5" />
                                Export as Markdown
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Move to project</div>
                              <DropdownMenuItem
                                onClick={() => setConversationProject(conv.conversation_id, null)}
                                className="gap-2 text-xs"
                                disabled={!conv.project_id}
                              >
                                <X className="h-3.5 w-3.5" />
                                No project
                              </DropdownMenuItem>
                              {projects.map((p) => (
                                <DropdownMenuItem
                                  key={p.id}
                                  onClick={() => setConversationProject(conv.conversation_id, p.id)}
                                  className="gap-2 text-xs"
                                  disabled={conv.project_id === p.id}
                                >
                                  <FileBox className="h-3.5 w-3.5" />
                                  <span className="truncate">{p.name}</span>
                                </DropdownMenuItem>
                              ))}
                              {projects.length === 0 && (
                                <DropdownMenuItem
                                  onClick={() => { setNewProjectName(''); setNewProjectOpen(true); }}
                                  className="gap-2 text-xs"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Create project…
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => archiveConversation(conv.conversation_id, !conv.archived)} className="gap-2 text-xs">
                                {conv.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                {conv.archived ? 'Restore from archive' : 'Archive'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {pinned.length > 0 && (
                      <div className="mb-4">
                        <div className="px-2 mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Pinned
                        </div>
                        <div className="space-y-0.5">{pinned.map(renderConv)}</div>
                      </div>
                    )}
                    {projects.length > 0 && (
                      <div className="mb-4">
                        <div className="px-2 mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Projects</div>
                        <div className="space-y-1">
                          {projects.map((p) => {
                            const items = projectMap.get(p.id) || [];
                            const collapsed = !!collapsedProjects[p.id];
                            const isEditing = editingProjectId === p.id;
                            return (
                              <div key={p.id} className="rounded-md">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 p-1.5">
                                    <Input
                                      value={editProjectName}
                                      onChange={(e) => setEditProjectName(e.target.value)}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') { await renameProject(p.id, editProjectName); setEditingProjectId(null); }
                                        if (e.key === 'Escape') setEditingProjectId(null);
                                      }}
                                      className="h-7 text-sm"
                                      autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={async () => { await renameProject(p.id, editProjectName); setEditingProjectId(null); }}>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center group/proj px-2 py-1 rounded hover:bg-secondary/40">
                                    <button
                                      onClick={() => setCollapsedProjects((s) => ({ ...s, [p.id]: !s[p.id] }))}
                                      className="flex-1 min-w-0 flex items-center gap-2 text-left"
                                    >
                                      <FileBox className="h-3.5 w-3.5 shrink-0 text-accent" />
                                      <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">{items.length}</span>
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="opacity-0 group-hover/proj:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 ml-1 rounded hover:bg-background" aria-label="Project options">
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem onClick={() => { setEditingProjectId(p.id); setEditProjectName(p.name); }} className="gap-2 text-xs">
                                          <Pencil className="h-3.5 w-3.5" /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setDeleteProjectId(p.id)} className="gap-2 text-xs text-destructive focus:text-destructive">
                                          <Trash2 className="h-3.5 w-3.5" /> Delete project
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                                {!collapsed && items.length > 0 && (
                                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/60 pl-1.5">
                                    {items.map(renderConv)}
                                  </div>
                                )}
                                {!collapsed && items.length === 0 && (
                                  <div className="ml-5 px-2 py-1 text-[11px] text-muted-foreground">Empty — move a chat here.</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {Object.entries(grouped).map(([label, items]) =>
                      items.length === 0 ? null : (
                        <div key={label} className="mb-4">
                          <div className="px-2 mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
                          <div className="space-y-0.5">{items.map(renderConv)}</div>
                        </div>
                      )
                    )}
                    {archivedConversations.length > 0 && (
                      <div className="mt-4 border-t border-border/60 pt-3">
                        <button
                          onClick={() => setArchivedOpen((v) => !v)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground transition-colors"
                        >
                          {archivedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <Archive className="h-3 w-3" />
                          Archived
                          <span className="ml-auto text-muted-foreground/70 normal-case font-normal">{archivedConversations.length}</span>
                        </button>
                        {archivedOpen && (
                          <div className="mt-1 space-y-0.5 opacity-80">
                            {archivedConversations.map(renderConv)}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              {conversations.length === 0 && archivedConversations.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Your chat history will appear here.
                </div>
              )}
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Pathforge Advisor</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 relative"
              onClick={() => setArtifactsOpen(true)}
              aria-label="Open artifacts"
              title="Artifacts"
            >
              <FileBox className="h-4 w-4" />
              {artifacts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center">
                  {artifacts.length}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAudioEnabled((v) => !v);
              }}
              aria-label={audioEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-10"
              >
                <h1 className="text-3xl font-semibold tracking-tight mb-2">{(() => {
                  const first = (profile?.full_name?.split(' ')[0] || profile?.username || '').trim();
                  if (!first) return 'How can I help today?';
                  // Daily-rotating greeting: same template all day, changes tomorrow.
                  const templates = [
                    `Hey, ${first}.`,
                    `${first} returns.`,
                    `Back at it, ${first}.`,
                    `Ready when you are, ${first}.`,
                    `Good to see you, ${first}.`,
                    `Let's get tinkering, ${first}.`,
                    `${first} — what are we untangling today?`,
                  ];
                  const today = new Date();
                  const seed = Number(`${today.getFullYear()}${today.getMonth()+1}${today.getDate()}`) + (first.charCodeAt(0) || 0);
                  return templates[seed % templates.length];
                })()}</h1>
                <p className="text-muted-foreground">Ask anything about your college admissions journey.</p>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {STARTER_PROMPTS.map((p, i) => (
                  <motion.button
                    key={p.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 * i }}
                    onClick={() => sendMessage(p.subtitle)}
                    className="group text-left rounded-xl border border-border bg-card hover:bg-secondary/40 hover:border-accent/40 p-4 transition-all"
                  >
                    <div className="font-medium text-sm">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.subtitle}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn('mb-6 flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-foreground'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-3 prose-headings:mb-2">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 flex gap-3 justify-start"
                >
                  <div className="bg-secondary/50 rounded-2xl px-4 py-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {/* Glowing accent-blue keyword, Claude-CLI style. The glow is
                        tuned twice: softer on the cream light background, brighter
                        on dark navy. Reduced motion gets the colour, no pulse. */}
                    <motion.span
                      className={cn(
                        'text-sm font-medium text-accent',
                        '[text-shadow:0_0_10px_hsl(var(--accent)_/_0.40),0_0_24px_hsl(var(--accent)_/_0.18)]',
                        'dark:[text-shadow:0_0_10px_hsl(var(--accent)_/_0.60),0_0_26px_hsl(var(--accent)_/_0.32)]'
                      )}
                      animate={prefersReducedMotion ? undefined : { opacity: [1, 0.6, 1] }}
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                      }
                    >
                      {thinkingWord}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">
                      ({thinkingSeconds}s · thinking with {activeEffort.label})
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto w-full px-4 py-4">
            <AnimatePresence>
              {limitHit && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {limitHit === 'credits' ? "You've run out of credits." : "You've hit your usage limit."}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {limitHit === 'credits'
                        ? 'Upgrade your plan to keep chatting with the advisor.'
                        : 'Please wait a moment, or upgrade for higher limits.'}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate('/pricing')} className="shrink-0">
                    Upgrade plan
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setLimitHit(null)}
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <AttachmentChips items={attachments} onRemove={removeAttachment} />

            {/* Clickable follow-ups from the advisor's last reply. Sits where
                the model/effort selectors used to live. */}
            <AnimatePresence>
              {suggestions.length > 0 && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="mb-2 flex flex-wrap gap-1.5"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
                    >
                      <Sparkles className="h-3 w-3 text-accent shrink-0" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={handleSubmit}
              className={cn(
                'relative flex items-end gap-2 rounded-2xl border bg-card transition-all',
                'border-border focus-within:border-accent/50 focus-within:shadow-md',
                isListening && 'border-destructive/50 ring-2 ring-destructive/20'
              )}
            >
              <Textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening…' : 'Message Pathforge Advisor…'}
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 max-h-[200px] text-sm shadow-none"
                disabled={isProcessing}
              />
              <div className="flex items-center gap-1 p-2">
                <FileUploadButton onFiles={handleFilesSelected} disabled={isProcessing} />

                {/* Model (cosmetic) + Effort (real), sitting alongside the
                    attachment button rather than floating above the box. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title={`Model: ${activeModel.label}`}
                      aria-label={`Model: ${activeModel.label}`}
                      className="group inline-flex items-center justify-center gap-1 rounded-lg px-2 h-8 min-w-8 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      <span className="hidden sm:inline">{activeModel.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {MODEL_OPTIONS.map((m) => {
                      const locked = !hasPlan(m.requiredPlan);
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={(e) => {
                            // Keep the menu open feel simple: gated clicks fire the upsell.
                            selectModel(m.id);
                            if (locked) e.preventDefault();
                          }}
                          className="flex items-start gap-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              {m.label}
                              {locked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  <Lock className="h-2.5 w-2.5" />
                                  {planForTier(m.requiredPlan).name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{m.blurb}</div>
                          </div>
                          {m.id === activeModel.id && !locked && <Check className="mt-0.5 h-4 w-4 text-accent" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title={`Reasoning effort: ${activeEffort.label}`}
                      aria-label={`Reasoning effort: ${activeEffort.label}`}
                      className="group inline-flex items-center justify-center gap-1 rounded-lg px-2 h-8 min-w-8 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      <span className="hidden sm:inline text-accent">{activeEffort.label}</span>
                      {/* At mobile width only the chevron shows, so it carries the
                          accent tint that the label carries on larger screens. */}
                      <ChevronDown className="h-3 w-3 opacity-70 text-accent sm:text-current transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {EFFORT_OPTIONS.map((e) => (
                      <DropdownMenuItem
                        key={e.id}
                        onClick={() => selectEffort(e.id)}
                        className="flex items-start gap-2"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{e.label}</div>
                          <div className="text-[11px] text-muted-foreground">{e.blurb}</div>
                        </div>
                        {e.id === activeEffort.id && <Check className="mt-0.5 h-4 w-4 text-accent" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  size="icon"
                  variant={isListening ? 'destructive' : 'ghost'}
                  className="h-8 w-8 rounded-lg"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  aria-label={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  disabled={(!textInput.trim() && !attachments.some((a) => a.status === 'ready')) || isProcessing || attachments.some((a) => a.status === 'uploading' || a.status === 'processing')}
                  aria-label="Send message"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Pathforge Advisor uses AI. Verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Delete dialogs removed — archive is used instead. */}

      {/* New project dialog */}
      <AlertDialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New project</AlertDialogTitle>
            <AlertDialogDescription>
              Group related advisor chats together. You can move any chat into a project later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. MIT application"
            autoFocus
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newProjectName.trim()) {
                await createProject(newProjectName);
                setNewProjectOpen(false);
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!newProjectName.trim()) return;
                await createProject(newProjectName);
                setNewProjectOpen(false);
              }}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete project dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(o) => !o && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will be removed. Chats inside it will be moved back to your main list, not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteProjectId) return;
                await deleteProject(deleteProjectId);
                setDeleteProjectId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArtifactsPanel open={artifactsOpen} onOpenChange={setArtifactsOpen} conversationId={currentConversationId} />

    </div>
  );
}
