import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifyCreditConsumed } from '@/hooks/useCredits';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Send,
  Volume2,
  VolumeX,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Zap,
  FileBox,
  ChevronDown,
  X,
  Check,
  Lock,
  Sparkles,
  Archive,
  Terminal,
  Compass,
  Hammer,
  PenLine,
  MapPin,
  Copy,
  RotateCcw,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import ClaudeModelSelector from '@/components/ui/claude-model-selector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { usePlanTier } from '@/hooks/usePlanTier';
import { planForTier } from '@/lib/plans';
import { useAdvisorHistory, type ConversationGroup } from '@/hooks/useAdvisorHistory';
import { useAdvisorArtifacts } from '@/hooks/useAdvisorArtifacts';
import { useAdvisorSettings, type AdvisorSettings } from '@/hooks/useAdvisorSettings';
import { useAdvisorTokens, formatTokens } from '@/hooks/useAdvisorTokens';
import { useAdvisorSkills } from '@/hooks/useAdvisorSkills';
import { useOutcomesData, type OutcomesProfile } from '@/hooks/useOutcomesData';
import { FileUploadButton } from '@/components/advisor/FileUploadButton';
import { AttachmentChips, type Attachment } from '@/components/advisor/AttachmentChips';
import { ArtifactsPanel } from '@/components/advisor/ArtifactsPanel';
import { ArtifactInlineCard } from '@/components/advisor/ArtifactInlineCard';
import { ConversationSidebar } from '@/components/advisor/ConversationSidebar';
import { ThinkingBlock, nextThinkingKeyword } from '@/components/advisor/ThinkingBlock';
import { SkillsPanel } from '@/components/advisor/SkillsPanel';
import { ContextMeter } from '@/components/advisor/ContextMeter';
import { CommandPalette } from '@/components/advisor/CommandPalette';
import { ToolActionCard } from '@/components/advisor/ToolActionCard';
import { markdownCodeComponents } from '@/components/advisor/CodeBlock';
import type { AdvisorArtifact } from '@/hooks/useAdvisorArtifacts';
import { ingestFile } from '@/lib/advisorUploads';
import {
  streamAdvisor,
  stripSuggestionMarker,
  AdvisorLimitError,
  type StreamedToolCall,
} from '@/lib/advisorStream';
import {
  ADVISOR_MODELS,
  DEFAULT_ADVISOR_MODEL,
  modelFromGateway,
  readStoredModel,
  writeStoredModel,
} from '@/lib/advisorModels';
import {
  validateToolCall,
  TOOL_SPECS,
  TOOL_NAMES,
  type AdvisorToolCall,
  type AddOutcomeArgs,
} from '@/lib/advisorTools';
import {
  contextUsage,
  contextWindowFor,
  turnsWithinBudget,
  formatContextTokens,
  SYSTEM_OVERHEAD_TOKENS,
  SKILL_OVERHEAD_TOKENS,
  COMPACTION_PROMPT,
  COMPACTION_HEADER,
} from '@/lib/advisorContext';
import {
  buildCommandList,
  matchCommands,
  resolveCommand,
  readCommandDraft,
  isPaletteOpen,
  COMMAND_ROUTES,
  type AdvisorCommand,
} from '@/lib/advisorCommands';
import ReactMarkdown from 'react-markdown';
// GitHub-flavoured markdown: tables, task lists, strikethrough and autolinks.
// Without this plugin the advisor's tables render as literal pipe characters.
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Seo } from '@/components/Seo';
import { useKeepAlive } from '@/components/KeepAliveProvider';
import { transition } from '@/lib/motion';

// Three different things can stop a turn, and they have three different
// remedies: tokens refill next month, credits are the app-wide pool artifact
// generation still spends, and a rate limit clears on its own. Collapsing them
// into one notice would send a user to the pricing page over a 30-second wait.
type LimitKind = 'credits' | 'rate' | 'tokens' | null;

interface Message {
  id: string;
  role: 'user' | 'advisor';
  text: string;
  timestamp: Date;
  /** Streamed chain-of-thought for this turn, when the model emits one. */
  reasoning?: string;
  /** How long the turn took, frozen once it finishes. */
  seconds?: number;
  artifact?: AdvisorArtifact;
  toolCalls?: AdvisorToolCall[];
  /** True when the user pressed stop and this is what had arrived. */
  partial?: boolean;
  /** Installed skills whose instructions were loaded for this answer. */
  skills?: { slug: string; name: string }[];
  /**
   * What this row is.
   *
   *   answer  — the model replying. The default, and the only kind that is
   *             persisted or sent back as history.
   *   note    — a command's own output (`/help`, `/context`). Local, never
   *             leaves the browser, never re-enters the model's context.
   *   summary — the handover note `/compact` produced. It replaces the
   *             transcript it was made from and IS sent as history, because it
   *             is now the only record of what came before.
   */
  kind?: 'answer' | 'note' | 'summary';
}

/*
 * Quick start.
 *
 * Four generic prompts told a student what the advisor could talk about but not
 * what it was *for*. These are grouped by the four Journey phases the rest of
 * the product is built around, so the opening screen and the roadmap describe
 * the same thing — and a student who does not yet know what to ask can pick the
 * phase they are actually in and get a real question out of it.
 *
 * Only one group is shown at a time. A dozen prompts on one screen is a menu,
 * and a menu is what a blank chat box already was.
 */
interface StarterGroup {
  /** Matches the Journey phase names in src/pages/About.tsx and the roadmap. */
  phase: string;
  blurb: string;
  prompts: { title: string; subtitle: string }[];
}

const STARTER_GROUPS: StarterGroup[] = [
  {
    phase: 'Discover',
    blurb: 'Work out what is worth your time',
    prompts: [
      { title: 'Build my activity list', subtitle: 'Which extracurriculars actually matter for my intended major?' },
      { title: 'Find competitions', subtitle: 'Which Olympiads or competitions should I be aiming at this year?' },
      { title: 'Plan my next semester', subtitle: 'What courses should I take to strengthen my profile?' },
      { title: 'Check my direction', subtitle: 'Given what I have done so far, what am I missing?' },
    ],
  },
  {
    phase: 'Build',
    blurb: 'Turn effort into evidence',
    prompts: [
      { title: 'Log what I did', subtitle: 'Help me write up an activity properly for my record.' },
      { title: 'Plan my week', subtitle: 'How should I split my hours across what I am working on?' },
      { title: 'Start a research project', subtitle: 'How do I find a research question I can actually finish?' },
      { title: 'Ask for a recommendation', subtitle: 'How and when should I approach a teacher for a letter?' },
    ],
  },
  {
    phase: 'Apply',
    blurb: 'Make the application read like you',
    prompts: [
      { title: 'Sharpen my essay topic', subtitle: 'Help me find a story that stands out without exaggerating it.' },
      { title: 'Tighten a draft', subtitle: 'Read my essay and tell me where the argument goes slack.' },
      { title: 'Write an activity entry', subtitle: 'Turn this description into a Common App activity entry.' },
      { title: 'Fix my supplementals', subtitle: 'What is this "why us" essay actually asking me for?' },
    ],
  },
  {
    phase: 'Decide',
    blurb: 'See where you really stand',
    prompts: [
      { title: 'Pick target colleges', subtitle: 'What schools fit my profile and goals?' },
      { title: 'Balance my list', subtitle: 'Is my list too top-heavy? What should I add or cut?' },
      { title: 'Read my odds honestly', subtitle: 'Where do I realistically stand at the schools on my list?' },
      { title: 'Find scholarships', subtitle: 'Which scholarships am I actually eligible for?' },
    ],
  },
];

/**
 * The pill row under the empty-state composer — one per Journey phase,
 * carrying that phase's single best opening question rather than the whole
 * grid of eight. Icons are the phase's own shorthand: scouting, building,
 * writing, deciding.
 */
const STARTER_PILLS: { phase: string; label: string; prompt: string; icon: typeof Compass }[] = [
  { phase: 'Discover', label: 'Build my activity list', prompt: STARTER_GROUPS[0].prompts[0].subtitle, icon: Compass },
  { phase: 'Build', label: 'Plan my week', prompt: STARTER_GROUPS[1].prompts[1].subtitle, icon: Hammer },
  { phase: 'Apply', label: 'Tighten a draft', prompt: STARTER_GROUPS[2].prompts[1].subtitle, icon: PenLine },
  { phase: 'Decide', label: 'Pick target colleges', prompt: STARTER_GROUPS[3].prompts[0].subtitle, icon: MapPin },
];

/*
 * Quick replies.
 *
 * The advisor's own follow-ups (`suggestions`) come back from the model and are
 * better when they arrive, because they know what was just said — but they are
 * not guaranteed, and a turn that returns none left the composer with nothing
 * to press. These four are the follow-ups that are useful after almost any
 * answer, so they stand in rather than leaving an empty strip.
 */
const FALLBACK_REPLIES = [
  'Why?',
  'Give me a concrete example.',
  'What should I do first?',
  'Say that more simply.',
];

// Effort is real: it writes reasoning_effort to advisor_settings, which the
// voice-advisor edge function forwards to the model as reasoning.effort.
const EFFORT_OPTIONS = [
  { id: 'none', label: 'Instant', blurb: 'Fastest — no extra reasoning' },
  { id: 'low', label: 'Low', blurb: 'A little thinking before replying' },
  { id: 'medium', label: 'Balanced', blurb: 'More careful, still snappy' },
  { id: 'high', label: 'Deep', blurb: 'Most thorough — best for hard problems' },
  { id: 'extra', label: 'Extra', blurb: 'Beyond Deep — runs at the model’s max reasoning effort' },
  { id: 'max', label: 'Max', blurb: 'Beyond Deep — runs at the model’s max reasoning effort' },
  { id: 'ultracode', label: 'Ultracode', blurb: 'Beyond Deep — runs at the model’s max reasoning effort' },
] as const;

/** The `claude-model-selector` slider's own 6 stations, in order — the
 * source of truth for mapping its 0-5 index onto `reasoning_effort`. The
 * backend only ever forwards low/medium/high to the model (see
 * `voice-advisor`'s `ALLOWED_REASONING`); "extra"/"max"/"ultracode" persist
 * and round-trip through the slider like any other station, they just run
 * the model at the same ceiling "high" already does. */
const EFFORT_SLIDER_LEVELS = ['low', 'medium', 'high', 'extra', 'max', 'ultracode'] as const;

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

/** Title for a conversation the server never got to name (e.g. after a stop). */
function localTitle(userMessage: string): string | null {
  const words = userMessage.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return null;
  return words.join(' ').slice(0, 60);
}

/**
 * Turn a validated `add_outcome_item` call into the record shape the Outcomes
 * page stores. Every branch fills the same fields the manual "Add" forms do, so
 * an advisor-added row is indistinguishable from a hand-typed one.
 */
function applyOutcomeItem(prev: OutcomesProfile, args: AddOutcomeArgs): OutcomesProfile {
  const id = crypto.randomUUID();
  const org = args.organization;
  const detail = args.detail;
  switch (args.category) {
    case 'project':
      return {
        ...prev,
        projects: [
          ...prev.projects,
          { id, title: args.title, description: detail, duration: '', outcome: '', evidenceState: 'not_started' },
        ],
      };
    case 'leadership':
      return {
        ...prev,
        leadershipRoles: [
          ...prev.leadershipRoles,
          { id, title: args.title, organization: org, duration: '', teamSize: 0, evidenceState: 'not_started' },
        ],
      };
    case 'competition':
      return {
        ...prev,
        competitions: [
          ...prev.competitions,
          { id, name: args.title, level: 'school', result: detail, evidenceState: 'not_started' },
        ],
      };
    case 'service':
      return {
        ...prev,
        serviceRoles: [
          ...prev.serviceRoles,
          { id, role: args.title, organization: org, hours: 0, impact: detail, evidenceState: 'not_started' },
        ],
      };
    case 'internship':
      return {
        ...prev,
        internships: [
          ...prev.internships,
          { id, title: args.title, organization: org, duration: '', outcome: detail, evidenceState: 'not_started' },
        ],
      };
    case 'research':
      return {
        ...prev,
        researchOutputs: [
          ...prev.researchOutputs,
          { id, title: args.title, venue: org, role: detail || 'Contributor', evidenceState: 'not_started' },
        ],
      };
    case 'creative':
      return {
        ...prev,
        creativeWorks: [
          ...prev.creativeWorks,
          { id, title: args.title, platform: org, reach: detail, evidenceState: 'not_started' },
        ],
      };
    default:
      return prev;
  }
}

export default function Advisor() {
  const { user, onboardingData, profile, refreshOnboardingData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations,
    archivedConversations,
    renameConversation,
    saveMessage,
    exportConversation,
    projects,
    createProject,
    renameProject,
    deleteProject,
    deleteConversation,
    setConversationProject,
    togglePin,
    archiveConversation,
  } = useAdvisorHistory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Scope the app-wide keep-alive stack (audio context + worker heartbeat) to
  // only run while a message is actually being generated.
  useKeepAlive(isProcessing);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  // Desktop rail: collapses to an icon-only strip and expands on hover
  // (mirrors a Notion/Vercel-style docked sidebar). `pinned` overrides hover
  // so a user who wants it permanently open doesn't have to keep their mouse
  // there — the header toggle button flips this on desktop, and flips the
  // mobile overlay (`sidebarOpen`) on small screens instead.
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;
  const [limitHit, setLimitHit] = useState<LimitKind>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepthRef = useRef(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  // "Skills" and "Plugins" in the rail are two doors into one sheet; this says
  // which part of it the visitor came for.
  const [skillsFocus, setSkillsFocus] = useState<'installed' | 'catalog'>('installed');
  const [focusArtifactId, setFocusArtifactId] = useState<string | null>(null);
  // Which row of the `/` palette is selected, and whether the user has
  // dismissed it for this draft (escape closes it without clearing the text).
  const [commandIndex, setCommandIndex] = useState(0);
  const [paletteDismissed, setPaletteDismissed] = useState(false);
  const [compacting, setCompacting] = useState(false);

  // Live turn state — one keyword and one timer per response.
  const [thinkingWord, setThinkingWord] = useState<string>(() => nextThinkingKeyword());
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const {
    artifacts,
    refresh: refreshArtifacts,
    getDownloadUrl: getArtifactDownloadUrl,
    remove: removeArtifact,
  } = useAdvisorArtifacts(currentConversationId);

  const { updateProfile: updateOutcomesProfile } = useOutcomesData();

  const { settings: advisorSettings, loading: settingsLoading, save: saveAdvisorSettings } = useAdvisorSettings();

  // The advisor's own monthly token pool. Separate from `useCredits`, which
  // meters the rest of the app — see src/hooks/useAdvisorTokens.ts.
  const {
    status: tokenStatus,
    refresh: refreshTokens,
    applyServerBalance: applyTokenBalance,
  } = useAdvisorTokens();

  const {
    catalog: skillCatalog,
    installed: installedSkills,
    loading: skillsLoading,
    installFromCatalog,
    installCustom,
    remove: removeSkill,
    setEnabled: setSkillEnabled,
  } = useAdvisorSkills();
  const [modelId, setModelId] = useState<string>(() => readStoredModel().id);
  const { has: hasPlan } = usePlanTier();

  // Never leave a gated model selected (e.g. a lapsed subscription): fall back
  // to the best model the user can actually access.
  const rawModel = ADVISOR_MODELS.find((m) => m.id === modelId) ?? DEFAULT_ADVISOR_MODEL;
  const activeModel = hasPlan(rawModel.requiredPlan) ? rawModel : DEFAULT_ADVISOR_MODEL;
  const activeEffort =
    EFFORT_OPTIONS.find((e) => e.id === advisorSettings.reasoning_effort) ?? EFFORT_OPTIONS[0];
  // Where the claude-model-selector's thumb sits for the current setting.
  // Anything the slider doesn't know about (only "none", from before the
  // slider replaced the old picker) starts the thumb at its lowest station.
  const effortSliderIndex = Math.max(
    0,
    EFFORT_SLIDER_LEVELS.indexOf(advisorSettings.reasoning_effort as (typeof EFFORT_SLIDER_LEVELS)[number]),
  );
  // The badge counts what will actually be offered to the model this turn, so
  // a skill switched off does not inflate it.
  const enabledSkillCount = installedSkills.filter((s) => s.enabled).length;

  /*
   * The advisor is bounded by its context window, not by the account's token
   * grant. `notes` are the client's own output (a `/help` listing, a `/context`
   * breakdown) — they are never sent anywhere, so they must not count against
   * the window or the student would be charged context for reading a help
   * message. See src/lib/advisorContext.ts.
   */
  const contextTurns = useMemo(
    () =>
      messages
        .filter((m) => m.kind !== 'note')
        .map((m) => ({ role: m.role, text: m.text })),
    [messages],
  );

  const usage = useMemo(
    () => contextUsage(contextTurns, { model: activeModel, enabledSkills: enabledSkillCount }),
    [contextTurns, activeModel, enabledSkillCount],
  );

  /*
   * What the quick-reply strip shows. The model's own follow-ups win when it
   * returned any — they know what was just said. Otherwise the generic four
   * stand in, but only once there is an advisor answer to follow up on and only
   * when the last thing said was the advisor's: offering "Why?" under a user
   * message that has not been answered yet is nonsense.
   */
  const lastMessage = messages[messages.length - 1];
  const quickReplies = useMemo(() => {
    if (suggestions.length > 0) return suggestions;
    if (!lastMessage || lastMessage.role !== 'advisor' || lastMessage.kind === 'note') return [];
    if (!lastMessage.text.trim()) return [];
    return FALLBACK_REPLIES;
  }, [suggestions, lastMessage]);

  const commands = useMemo(() => buildCommandList(installedSkills), [installedSkills]);
  const commandDraft = readCommandDraft(textInput);
  const paletteVisible = isPaletteOpen(textInput) && !paletteDismissed && !isProcessing;
  const matchedCommands = useMemo(
    () => (paletteVisible ? matchCommands(commands, commandDraft?.name ?? '') : []),
    [paletteVisible, commands, commandDraft?.name],
  );
  // The highlight can outrun the list as it filters down; clamp rather than
  // letting Enter run whatever happens to be at a stale index.
  const activeCommandIndex = matchedCommands.length
    ? Math.min(commandIndex, matchedCommands.length - 1)
    : 0;

  // `advisor_settings.model` is the value the edge function actually reads, so
  // once it has loaded it wins over the browser copy. Legacy gateway ids
  // (including retired preview models) resolve onto a current tier rather than
  // leaving the picker showing nothing.
  const adoptedServerModel = useRef(false);
  useEffect(() => {
    if (settingsLoading || adoptedServerModel.current) return;
    adoptedServerModel.current = true;
    const fromServer = modelFromGateway(advisorSettings.model);
    if (fromServer.id !== modelId && hasPlan(fromServer.requiredPlan)) {
      setModelId(fromServer.id);
      writeStoredModel(fromServer.id);
    }
  }, [settingsLoading, advisorSettings.model, modelId, hasPlan]);

  const selectModel = useCallback(
    (id: string) => {
      const m = ADVISOR_MODELS.find((o) => o.id === id) ?? DEFAULT_ADVISOR_MODEL;
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
      setModelId(m.id);
      writeStoredModel(m.id);
      // The picker is real: the tier maps to a gateway model id, which the edge
      // function re-validates against its own allowlist before using.
      saveAdvisorSettings({ model: m.gateway }).catch(() => {
        toast({ variant: 'destructive', title: "Couldn't switch model", description: 'Please try again.' });
      });
    },
    [hasPlan, navigate, toast, saveAdvisorSettings],
  );

  const selectEffort = useCallback(
    (id: AdvisorSettings['reasoning_effort']) => {
      saveAdvisorSettings({ reasoning_effort: id }).catch(() => {
        toast({ variant: 'destructive', title: "Couldn't update effort", description: 'Please try again.' });
      });
    },
    [saveAdvisorSettings, toast],
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

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
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
    },
    [user, toast],
  );

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleComposerDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
  }, []);

  const handleComposerDragEnter = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }, []);

  const handleComposerDragLeave = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  }, []);

  const handleComposerDrop = useCallback(
    (e: React.DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) handleFilesSelected(files);
    },
    [handleFilesSelected],
  );

  /**
   * A large paste (code dump, an essay draft) becomes a "Pasted" chip instead
   * of filling the textarea — same rendering path as a real file attachment,
   * just without a storage upload since there's no File object behind it.
   */
  const handleComposerPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text.length <= 300) return;
    e.preventDefault();
    setAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Pasted text (${text.length.toLocaleString()} chars)`,
        size: text.length,
        mime: 'text/plain',
        kind: 'text',
        status: 'ready',
        extractedText: text.slice(0, 30000),
        summary: `Pasted text (${text.length} chars).`,
        pasted: true,
      },
    ]);
  }, []);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Scroll only the message list's own scroll container — scrollIntoView()
    // on a sentinel walks up the ancestor chain and can drag the whole
    // document down with it, not just this panel.
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isProcessing]);

  // One keyword per response, held for the whole response; the timer ticks
  // alongside it. Runs only on the false→true edge.
  useEffect(() => {
    if (!isProcessing) return;
    setThinkingWord(nextThinkingKeyword());
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
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`;
  }, [textInput]);

  // Escape dismisses the command palette for the draft it was dismissed on;
  // clearing the slash starts a new draft, so it becomes offerable again. The
  // highlight goes back to the top whenever the filter changes, or Enter would
  // run whatever was selected before the list under it moved.
  useEffect(() => {
    if (!textInput.startsWith('/')) setPaletteDismissed(false);
    setCommandIndex(0);
  }, [textInput]);

  // Abort any in-flight response if the page goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

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
    [audioEnabled],
  );

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  /* ------------------------------------------------------------- tool calls */

  const patchToolCall = useCallback(
    (messageId: string, toolId: string, patch: Partial<AdvisorToolCall>) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, toolCalls: (m.toolCalls || []).map((t) => (t.id === toolId ? { ...t, ...patch } : t)) }
            : m,
        ),
      );
    },
    [],
  );

  /**
   * Run one validated tool call. This is the only place a model-originated
   * action reaches the app, and it only ever sees calls that already passed
   * `validateToolCall` — unknown names and out-of-allowlist routes never make
   * it this far.
   */
  const executeToolCall = useCallback(
    async (messageId: string, tool: AdvisorToolCall) => {
      patchToolCall(messageId, tool.id, { status: 'running' });
      try {
        if (tool.call.name === 'navigate') {
          patchToolCall(messageId, tool.id, { status: 'done', summary: tool.call.args.path });
          navigate(tool.call.args.path);
          return;
        }
        // install_skill / remove_skill — the model passed a slug and nothing
        // else. The hook resolves it against the catalogue and writes through
        // the same owner-scoped RLS path the Skills panel uses, so the model
        // cannot author the instructions that land in its own system prompt.
        if (tool.call.name === 'install_skill') {
          const row = await installFromCatalog(tool.call.args.slug);
          patchToolCall(messageId, tool.id, {
            status: 'done',
            summary: `${row.name} is installed. It loads when a message matches it.`,
          });
          return;
        }
        if (tool.call.name === 'remove_skill') {
          const row = await removeSkill(tool.call.args.slug);
          patchToolCall(messageId, tool.id, { status: 'done', summary: `${row.name} removed.` });
          return;
        }
        // add_outcome_item — goes through the same RLS-scoped hook the Outcomes
        // page writes with. No user id crosses the wire; Postgres derives it.
        const args = tool.call.args;
        updateOutcomesProfile((prev) => applyOutcomeItem(prev, args));
        patchToolCall(messageId, tool.id, {
          status: 'done',
          summary: 'Saved to your Outcomes profile.',
        });
      } catch (e) {
        patchToolCall(messageId, tool.id, {
          status: 'failed',
          error: e instanceof Error ? e.message : 'The action could not be completed.',
        });
      }
    },
    [installFromCatalog, navigate, patchToolCall, removeSkill, updateOutcomesProfile],
  );

  const confirmToolCall = useCallback(
    (messageId: string, toolId: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      const tool = msg?.toolCalls?.find((t) => t.id === toolId);
      if (!tool || tool.status !== 'pending') return;
      void executeToolCall(messageId, tool);
    },
    [executeToolCall],
  );

  const dismissToolCall = useCallback(
    (messageId: string, toolId: string) => {
      patchToolCall(messageId, toolId, { status: 'dismissed', summary: 'Nothing was changed.' });
    },
    [patchToolCall],
  );

  /* ---------------------------------------------------------------- sending */

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (raw: string, fromVoice = false) => {
      const cleaned = fromVoice ? cleanSpeechInput(raw) : raw.trim();
      if ((!cleaned && attachments.length === 0) || isProcessing) return;
      // Sending while a file is still uploading/being parsed would drop it
      // silently — the payload below only includes 'ready' attachments, but
      // clearing state unconditionally made pending ones vanish from the UI
      // too. Bail out here so callers (handleSubmit) can surface that instead.
      if (attachments.some((a) => a.status === 'uploading' || a.status === 'processing')) return;

      if (isListening) stopListening();
      setIsProcessing(true);
      setLimitHit(null);
      setTextInput('');
      setStreamStatus(null);
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

      const displayText =
        cleaned ||
        (readyAttachments.length
          ? `(Sent ${readyAttachments.length} attachment${readyAttachments.length > 1 ? 's' : ''})`
          : '');

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        text: displayText,
        timestamp: new Date(),
      };
      const answerId = crypto.randomUUID();
      const answerMsg: Message = {
        id: answerId,
        role: 'advisor',
        text: '',
        timestamp: new Date(),
        reasoning: '',
        toolCalls: [],
      };
      // Notes are the client's own output and were never part of the
      // conversation the model is having; sending them back would have the
      // advisor reading its own help text as if the student had said it.
      const historyForServer = [...messagesRef.current.filter((m) => m.kind !== 'note'), userMsg];
      setMessages([...messagesRef.current, userMsg, answerMsg]);
      setStreamingId(answerId);

      /*
       * How much transcript to send. A quarter of the window is held back for
       * the answer itself — a request that fills the context exactly leaves the
       * model nowhere to write. Anything older than the remainder is dropped
       * rather than truncated mid-message, and `/compact` is what turns that
       * dropped history back into something the model can still use.
       */
      const windowTokens = contextWindowFor(activeModel);
      const historyBudget = Math.max(
        2_000,
        windowTokens -
          SYSTEM_OVERHEAD_TOKENS -
          enabledSkillCount * SKILL_OVERHEAD_TOKENS -
          Math.round(windowTokens * 0.25),
      );
      const historyPayload = turnsWithinBudget(
        historyForServer.map((m) => ({ role: m.role, text: m.text })),
        historyBudget,
      );

      const isFirstInConversation = !currentConversationId;
      const startedAt = Date.now();

      // Tokens land far faster than React should re-render, so they buffer in
      // refs and flush once per animation frame.
      const textBuf = { current: '' };
      const reasonBuf = { current: '' };
      let flushQueued = false;
      const flush = () => {
        flushQueued = false;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === answerId
              ? { ...m, text: stripSuggestionMarker(textBuf.current), reasoning: reasonBuf.current }
              : m,
          ),
        );
      };
      const scheduleFlush = () => {
        if (flushQueued) return;
        flushQueued = true;
        requestAnimationFrame(flush);
      };

      const controller = new AbortController();
      abortRef.current = controller;

      const autoRun: AdvisorToolCall[] = [];

      const registerTool = (t: StreamedToolCall) => {
        const verdict = validateToolCall(t.name, t.args);
        if (!verdict.ok) {
          const rejected: AdvisorToolCall = {
            id: t.id,
            // Name only selects the card's icon and labels. A name we don't
            // recognise at all (the usual reason for a rejection) has no card
            // of its own, so it borrows navigate's.
            name: (TOOL_NAMES as readonly string[]).includes(t.name)
              ? (t.name as AdvisorToolCall['name'])
              : 'navigate',
            call: { name: 'navigate', args: { path: '/advisor', label: 'Blocked action' } },
            status: 'rejected',
            summary: verdict.reason,
          };
          setMessages((prev) =>
            prev.map((m) => (m.id === answerId ? { ...m, toolCalls: [...(m.toolCalls || []), rejected] } : m)),
          );
          return;
        }
        const spec = TOOL_SPECS[verdict.call.name];
        const entry: AdvisorToolCall = {
          id: t.id,
          name: verdict.call.name,
          call: verdict.call,
          status: 'pending',
          summary: spec.requiresConfirmation ? 'Waiting for you to confirm.' : '',
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === answerId ? { ...m, toolCalls: [...(m.toolCalls || []), entry] } : m)),
        );
        // Auto-run tools wait until the answer is on screen and saved —
        // navigating away mid-stream would kill the response being written.
        if (!spec.requiresConfirmation) autoRun.push(entry);
      };

      try {
        const result = await streamAdvisor(
          {
            message: cleaned || 'Please review the attached files.',
            onboardingData: {
              ...(onboardingData || {}),
              full_name: profile?.full_name || null,
              current_page: 'Advisor',
            },
            conversationHistory: historyPayload,
            generateTitle: isFirstInConversation,
            attachments: attachmentsPayload,
            conversationId: currentConversationId,
            language: (typeof window !== 'undefined' && localStorage.getItem('pf_language')) || 'en',
          },
          {
            onReasoning: (d) => {
              reasonBuf.current += d;
              scheduleFlush();
            },
            onText: (d) => {
              textBuf.current += d;
              scheduleFlush();
            },
            onStatus: (label) => setStreamStatus(label),
            onTool: registerTool,
            onArtifact: () => void refreshArtifacts(),
            onSkills: (skills) =>
              setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, skills } : m))),
          },
          controller.signal,
        );

        notifyCreditConsumed();
        // The `done` frame carries the post-charge balance, so the meter moves
        // with the answer. Only artifact turns actually spend credits now, but
        // notifyCreditConsumed() is cheap and this is the one place that knows
        // a turn finished.
        applyTokenBalance(result.tokens);
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const finalText = result.response || textBuf.current.trim();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === answerId
              ? {
                  ...m,
                  text: finalText,
                  reasoning: result.reasoning || reasonBuf.current,
                  seconds,
                  artifact: (result.artifact as AdvisorArtifact) || undefined,
                }
              : m,
          ),
        );

        setSuggestions(result.suggestions);
        if (result.artifact) void refreshArtifacts();
        if (result.action?.type === 'update_major') {
          void refreshOnboardingData();
          toast({ title: 'Major updated', description: `Your intended major is now ${result.action.value}.` });
        }
        if (audioEnabled && finalText) speakResponse(finalText);

        if (user && finalText) {
          const savedId = await saveMessage(
            cleaned,
            finalText,
            currentConversationId || undefined,
            result.topics,
            result.title,
          );
          if (savedId && !currentConversationId) setCurrentConversationId(savedId);
        }

        // Now that the answer is rendered and persisted, act on it.
        for (const tool of autoRun) {
          await executeToolCall(answerId, tool);
        }
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === 'AbortError';

        if (isAbort) {
          // Stopping keeps what arrived. The tokens generated before the stop
          // are still charged server-side, but this client hung up before the
          // frame carrying the new balance, so the meter has to ask.
          notifyCreditConsumed();
          void refreshTokens();
          const partialText = stripSuggestionMarker(textBuf.current).trim();
          const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          setMessages((prev) =>
            prev.flatMap((m) => {
              if (m.id !== answerId) return [m];
              if (!partialText && !reasonBuf.current) return [];
              return [{ ...m, text: partialText, reasoning: reasonBuf.current, seconds, partial: true }];
            }),
          );
          if (user && partialText) {
            const savedId = await saveMessage(
              cleaned,
              partialText,
              currentConversationId || undefined,
              [],
              isFirstInConversation ? localTitle(cleaned) : null,
            );
            if (savedId && !currentConversationId) setCurrentConversationId(savedId);
          }
        } else if (error instanceof AdvisorLimitError) {
          notifyCreditConsumed();
          if (error.kind === 'tokens') void refreshTokens();
          setLimitHit(error.kind);
          // Drop the optimistic pair — an upgrade card replaces it.
          setMessages((prev) => prev.filter((m) => m.id !== answerId && m.id !== userMsg.id));
        } else {
          toast({
            variant: 'destructive',
            title: 'Advisor unreachable',
            description:
              error instanceof Error
                ? error.message
                : 'We could not reach the advisor. Please try again in a moment.',
          });
          setMessages((prev) => prev.filter((m) => m.id !== answerId && m.id !== userMsg.id));
        }
      } finally {
        // A flush queued for the next frame is harmless here: it maps over the
        // current list and cannot re-add a message that was removed.
        abortRef.current = null;
        setStreamingId(null);
        setStreamStatus(null);
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
      executeToolCall,
      applyTokenBalance,
      refreshTokens,
      activeModel,
      enabledSkillCount,
    ],
  );

  const copyMessageText = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        toast({ variant: 'destructive', title: 'Could not copy to clipboard' });
      }
    },
    [toast],
  );

  /** Drops this answer and re-sends the user turn that produced it. */
  const retryMessage = useCallback(
    (answerIndex: number) => {
      if (isProcessing) return;
      let userText: string | null = null;
      for (let i = answerIndex - 1; i >= 0; i -= 1) {
        const m = messagesRef.current[i];
        if (m.role === 'user') {
          userText = m.text;
          break;
        }
      }
      if (userText == null) return;
      setMessages((prev) => prev.slice(0, answerIndex));
      sendMessage(userText);
    },
    [isProcessing, sendMessage],
  );

  // Auto-send a prefilled prompt when arriving from another page
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const prompt = searchParams.get('prompt');
    if (!prompt || isProcessing) return;
    autoSentRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('prompt');
    setSearchParams(next, { replace: true });
    sendMessage(prompt);
  }, [searchParams, setSearchParams, sendMessage, isProcessing]);

  // Memoised because `/new` reaches it through `runCommand`, which is itself a
  // useCallback — a plain function here would change identity every keystroke
  // and rebuild the whole command dispatcher with it.
  const startNewChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setCurrentConversationId(null);
    setTextInput('');
    setLimitHit(null);
    setSuggestions([]);
    setPaletteDismissed(false);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [stopStreaming]);

  /* ------------------------------------------------------------- commands */

  /**
   * Append a local note — a command's own output.
   *
   * Notes are markdown, render in their own frame, and never leave the browser:
   * they are excluded from the history sent to the server and from the context
   * meter. Reading `/help` should not cost the student any of their window.
   */
  const addNote = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'advisor', text, timestamp: new Date(), kind: 'note' },
    ]);
  }, []);

  /**
   * Replace the transcript with a summary of it.
   *
   * One turn through the same endpoint as everything else — the model is the
   * only thing that can read the conversation — but the result is handled
   * differently: it is not appended as a reply, it *becomes* the history. The
   * stored conversation is untouched, so reopening this chat from the sidebar
   * still shows every message; compaction is a property of the live thread.
   */
  const runCompaction = useCallback(async () => {
    if (isProcessing || compacting) return;
    const substance = messagesRef.current.filter((m) => m.kind !== 'note' && m.text.trim());
    if (substance.length < 2) {
      addNote("There isn't enough here to compact yet.");
      return;
    }

    setCompacting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await streamAdvisor(
        {
          message: COMPACTION_PROMPT,
          onboardingData: { current_page: 'Advisor' },
          conversationHistory: substance.map((m) => ({ role: m.role, text: m.text })),
          generateTitle: false,
          attachments: [],
          conversationId: currentConversationId,
          language: (typeof window !== 'undefined' && localStorage.getItem('pf_language')) || 'en',
        },
        {},
        controller.signal,
      );

      const summary = (result.response || '').trim();
      if (!summary) throw new Error('The summary came back empty.');

      const before = substance.length;
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'advisor',
          text: summary,
          timestamp: new Date(),
          kind: 'summary',
        },
      ]);
      setSuggestions([]);
      toast({
        title: 'Conversation compacted',
        description: `${before} messages became one summary. The full chat is still in your history.`,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast({
          variant: 'destructive',
          title: "Couldn't compact",
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    } finally {
      abortRef.current = null;
      setCompacting(false);
    }
  }, [isProcessing, compacting, currentConversationId, toast, addNote]);

  /**
   * Run one slash command.
   *
   * Returns true when the input was a command and has been dealt with, so the
   * composer knows not to also send it as a message. An unrecognised `/word` is
   * deliberately NOT swallowed — it goes to the advisor as ordinary text,
   * because a student writing "/r/applyingtocollege said…" should not have
   * their sentence eaten by a failed command lookup.
   */
  const runCommand = useCallback(
    (command: AdvisorCommand, argument: string): void => {
      const arg = argument.trim();

      // A skill command is a shorthand for @mentioning it, which is the path
      // the edge function already understands.
      if (command.group === 'skill' && command.slug) {
        sendMessage(`@${command.slug}${arg ? ` ${arg}` : ''}`);
        return;
      }

      const route = COMMAND_ROUTES[command.id];
      if (route) {
        navigate(route);
        return;
      }

      switch (command.id) {
        case 'compact':
          void runCompaction();
          return;

        case 'context': {
          const skillLine = enabledSkillCount
            ? `\n- **Skills** — ${formatContextTokens(enabledSkillCount * SKILL_OVERHEAD_TOKENS)} (${enabledSkillCount} enabled)`
            : '';
          addNote(
            [
              `### Context window`,
              ``,
              `**${usage.pct}% used** — ${formatContextTokens(usage.used)} of ${formatContextTokens(usage.window)}, ${formatContextTokens(usage.remaining)} left.`,
              ``,
              `- **This conversation** — ${formatContextTokens(usage.transcript)}`,
              `- **Instructions and your profile** — ${formatContextTokens(SYSTEM_OVERHEAD_TOKENS)}${skillLine}`,
              ``,
              `The window is how much of the conversation the advisor can still see. It is not a balance and it does not spend credits. When it fills, run \`/compact\`.`,
              ``,
              `You are on **${activeModel.label}**, which holds ${formatContextTokens(usage.window)}.`,
            ].join('\n'),
          );
          return;
        }

        case 'new':
          startNewChat();
          return;

        case 'rename':
          if (!currentConversationId) {
            addNote('There is nothing to rename yet — send a message first.');
            return;
          }
          if (!arg) {
            addNote('Give it a name: `/rename Stanford supplementals`');
            return;
          }
          renameConversation(currentConversationId, arg);
          toast({ title: 'Renamed', description: arg });
          return;

        case 'export':
          if (!currentConversationId) {
            addNote('There is nothing to export yet — send a message first.');
            return;
          }
          exportConversation(currentConversationId);
          return;

        case 'archive':
          if (!currentConversationId) {
            addNote('There is nothing to archive yet — send a message first.');
            return;
          }
          archiveConversation(currentConversationId, true);
          // Archiving the thread you are looking at and leaving it on screen
          // reads as a no-op, so this hands you a fresh one.
          startNewChat();
          toast({ title: 'Archived', description: 'Find it under Archived in the sidebar.' });
          return;

        case 'skills':
          setSkillsFocus('installed');
          setSkillsOpen(true);
          return;

        case 'plugins':
          // Same sheet, opened on the catalogue — which is what the word means.
          setSkillsFocus('catalog');
          setSkillsOpen(true);
          return;

        case 'artifacts':
          setArtifactsOpen(true);
          return;

        case 'voice':
          if (isSpeaking) stopSpeaking();
          setAudioEnabled((v) => {
            toast({ title: v ? 'Voice off' : 'Voice on' });
            return !v;
          });
          return;

        case 'model': {
          if (arg) {
            const wanted = arg.toLowerCase();
            const hit = ADVISOR_MODELS.find(
              (m) => m.id.toLowerCase() === wanted || m.label.toLowerCase() === wanted,
            );
            if (hit) {
              selectModel(hit.id);
              return;
            }
          }
          addNote(
            [
              `### Models`,
              ``,
              ...ADVISOR_MODELS.map(
                (m) =>
                  `- \`/model ${m.id}\` — **${m.label}**${m.id === activeModel.id ? ' *(current)*' : ''}. ${m.blurb}. Holds ${formatContextTokens(contextWindowFor(m))} of context.${hasPlan(m.requiredPlan) ? '' : ` Needs ${planForTier(m.requiredPlan).name}.`}`,
              ),
            ].join('\n'),
          );
          return;
        }

        case 'effort': {
          if (arg) {
            const wanted = arg.toLowerCase();
            const hit = EFFORT_OPTIONS.find(
              (e) => e.id === wanted || e.label.toLowerCase() === wanted,
            );
            if (hit) {
              selectEffort(hit.id);
              toast({ title: `Effort: ${hit.label}`, description: hit.blurb });
              return;
            }
          }
          addNote(
            [
              `### Reasoning effort`,
              ``,
              ...EFFORT_OPTIONS.map(
                (e) =>
                  `- \`/effort ${e.id}\` — **${e.label}**${e.id === activeEffort.id ? ' *(current)*' : ''}. ${e.blurb}.`,
              ),
            ].join('\n'),
          );
          return;
        }

        case 'help':
        default: {
          const skillRows = commands.filter((c) => c.group === 'skill');
          addNote(
            [
              `### Commands`,
              ``,
              ...commands
                .filter((c) => c.group !== 'skill')
                .map((c) => `- \`/${c.id}${c.argHint ? ` ${c.argHint}` : ''}\` — ${c.summary}`),
              ``,
              skillRows.length
                ? [
                    `### Your skills`,
                    ``,
                    ...skillRows.map((c) => `- \`/${c.id}\` — ${c.summary}`),
                  ].join('\n')
                : `You have no skills installed. Run \`/skills\` to browse them.`,
            ].join('\n'),
          );
          return;
        }
      }
    },
    [
      sendMessage,
      navigate,
      runCompaction,
      archiveConversation,
      startNewChat,
      addNote,
      usage,
      enabledSkillCount,
      activeModel,
      activeEffort,
      commands,
      currentConversationId,
      renameConversation,
      exportConversation,
      toast,
      isSpeaking,
      selectModel,
      selectEffort,
      hasPlan,
    ],
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isProcessing || compacting) return;

    // A command takes the whole line, so it is checked before anything is sent.
    const draft = readCommandDraft(textInput);
    if (draft) {
      const command = resolveCommand(commands, draft.name);
      if (command) {
        setTextInput('');
        setPaletteDismissed(false);
        runCommand(command, draft.rest);
        return;
      }
    }

    if (textInput.trim() || attachments.some((a) => a.status === 'ready')) {
      sendMessage(textInput.trim(), isListening);
      setPaletteDismissed(false);
    }
  };

  /** Complete the highlighted row: `/comp` → `/compact `, ready for an argument. */
  const acceptCommand = (command: AdvisorCommand) => {
    if (command.argHint) {
      setTextInput(`/${command.id} `);
      textareaRef.current?.focus();
      return;
    }
    setTextInput('');
    setPaletteDismissed(false);
    runCommand(command, '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteVisible && matchedCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex((i) => (i + 1) % matchedCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex((i) => (i - 1 + matchedCommands.length) % matchedCommands.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        acceptCommand(matchedCommands[activeCommandIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaletteDismissed(true);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const loadConversation = (conv: ConversationGroup) => {
    stopStreaming();
    setMessages(
      conv.messages.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp),
      })),
    );
    setCurrentConversationId(conv.conversation_id);
    setLimitHit(null);
    setSuggestions([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      const ok = await deleteConversation(conversationId);
      if (ok && conversationId === currentConversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    },
    [deleteConversation, currentConversationId],
  );

  const canSend =
    (textInput.trim().length > 0 || attachments.some((a) => a.status === 'ready')) &&
    !attachments.some((a) => a.status === 'uploading' || a.status === 'processing');

  // Shared between the mobile overlay and the desktop rail below — same
  // sidebar, two different chrome/animation treatments around it.
  const conversationSidebarProps = {
    conversations,
    archivedConversations,
    projects,
    currentConversationId,
    onNewChat: startNewChat,
    onSelect: loadConversation,
    onRename: renameConversation,
    onArchive: archiveConversation,
    onDelete: handleDeleteConversation,
    onTogglePin: togglePin,
    onExport: exportConversation,
    onSetProject: setConversationProject,
    onNewProject: () => {
      setNewProjectName('');
      setNewProjectOpen(true);
    },
    onRenameProject: renameProject,
    onDeleteProject: (id: string) => setDeleteProjectId(id),
    onOpenSkills: () => {
      setSkillsFocus('installed');
      setSkillsOpen(true);
    },
    onOpenPlugins: () => {
      setSkillsFocus('catalog');
      setSkillsOpen(true);
    },
    onOpenArtifacts: () => setArtifactsOpen(true),
    onOpenUsage: () => navigate('/profile?section=usage'),
    onOpenCommands: () => {
      const help = resolveCommand(commands, 'help');
      if (help) runCommand(help, '');
      if (window.innerWidth < 768) setSidebarOpen(false);
    },
    skillCount: enabledSkillCount,
    artifactCount: artifacts.length,
  };

  return (
    <div className="flex bg-background h-[calc(100svh-4rem)] min-h-0 overflow-hidden">
      <Seo
        title="Advisor — Pathforge"
        description="Talk or chat with your Pathforge AI advisor for instant, personalized college application guidance."
        path="/advisor"
      />

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

      {/* Sidebar — mobile: full-width overlay, click-toggled (unchanged).
          Desktop: an always-docked rail, see below. */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -288, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -288, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden flex w-72 flex-col border-r border-border bg-card/60 backdrop-blur-md fixed top-16 bottom-0 left-0 z-40"
          >
            <ConversationSidebar {...conversationSidebarProps} expanded />
          </motion.aside>
        )}
      </AnimatePresence>

      {/*
       * Desktop rail: always mounted (no unmount/remount on toggle — that's
       * what `sidebarOpen` used to gate, which fought with hover). Collapses
       * to an icon-only strip and expands on hover or when pinned, matching
       * a Notion/Vercel-style docked sidebar rather than the old binary
       * show/hide. Width is animated, not overlaid, so it pushes the chat
       * pane rather than covering it.
       */}
      <motion.aside
        animate={{ width: sidebarExpanded ? 288 : 56 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur-md overflow-hidden shrink-0"
      >
        <ConversationSidebar {...conversationSidebarProps} expanded={sidebarExpanded} />
      </motion.aside>

      {/* Main chat area */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Ambient glow behind the hero/composer, matching the advisor's glass
            look. Tokenized (not hardcoded hex) so it holds up in both themes,
            and z-0/pointer-events-none so it never intercepts a click. */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[128px]" />
          <div className="absolute top-1/3 right-1/3 h-64 w-64 rounded-full bg-accent/10 blur-[96px]" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 h-12 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen((v) => !v);
                else setSidebarPinned((v) => !v);
              }}
              aria-label={sidebarOpen || sidebarPinned ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen || sidebarPinned ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <span className="font-display font-semibold text-sm">Pathforge Advisor</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8 relative"
              onClick={() => setSkillsOpen(true)}
              aria-label="Open skills"
              title="Skills"
            >
              <Puzzle className="h-4 w-4" />
              {enabledSkillCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[11px] font-semibold flex items-center justify-center">
                  {enabledSkillCount}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8 relative"
              onClick={() => setArtifactsOpen(true)}
              aria-label="Open artifacts"
              title="Artifacts"
            >
              <FileBox className="h-4 w-4" />
              {artifacts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[11px] font-semibold flex items-center justify-center">
                  {artifacts.length}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8"
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
        <div ref={messagesContainerRef} className="relative z-10 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-center mb-10 space-y-3"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-block"
                >
                  <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/40 pb-1">
                    {(() => {
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
                      const seed =
                        Number(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`) +
                        (first.charCodeAt(0) || 0);
                      return templates[seed % templates.length];
                    })()}
                  </h1>
                  <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </motion.div>
                <motion.p
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Ask anything about your college admissions journey, or press{' '}
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">/</kbd>{' '}
                  for commands and skills.
                </motion.p>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6">
              {messages.map((msg, msgIndex) => {
                const isStreamingThis = streamingId === msg.id;
                const showThinking =
                  msg.role === 'advisor' &&
                  (isStreamingThis || !!msg.reasoning?.trim() || msg.partial);

                /*
                 * Notes and summaries are the app talking, not the advisor, so
                 * they are framed rather than set as running prose. Without the
                 * frame a `/help` listing reads as the model volunteering its
                 * own manual, and a compaction summary reads as an answer to a
                 * question nobody asked.
                 */
                if (msg.kind === 'note' || msg.kind === 'summary') {
                  const isSummary = msg.kind === 'summary';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={transition.fast}
                      className="mb-7"
                    >
                      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isSummary ? (
                            <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />
                          ) : (
                            <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                          <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            {isSummary ? COMPACTION_HEADER : 'Pathforge'}
                          </span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert mt-2 max-w-none break-words prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                        {isSummary && (
                          <p className="mt-2.5 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                            Everything before this was replaced to free the context window. The
                            full conversation is still saved in your history.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transition.fast}
                    /* Two turns, two different jobs, so two different
                       treatments. The question is a short aside and keeps a
                       surface; the answer is the substance of the page and gets
                       none. Putting both in facing bubbles is what makes every
                       chat product look like the same chat product, and it also
                       costs the answer ~15% of its measure for no gain — these
                       replies run to tables, code and headed sections. */
                    className={cn(
                      'mb-7 flex flex-col',
                      msg.role === 'user' ? 'items-end' : 'items-stretch',
                    )}
                  >
                    {msg.role === 'advisor' && (
                      <span className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Advisor
                      </span>
                    )}
                    <div
                      className={cn(
                        // break-words / min-w-0 because the content is arbitrary:
                        // a pasted URL or a model-emitted long token would
                        // otherwise push the turn past the viewport.
                        'min-w-0 break-words',
                        msg.role === 'user'
                          // The squared-off bottom-right corner is the only
                          // thing marking direction now that the fill is quiet.
                          ? 'max-w-[85%] rounded-2xl rounded-br-md border border-border bg-secondary/60 px-4 py-2.5 text-foreground'
                          : 'w-full text-foreground',
                      )}
                    >
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                      ) : (
                        <>
                          {/* Which skills shaped this answer. Without it a
                              student sees the advisor suddenly answer in a
                              different shape and has no way to tell why — or
                              which skill to switch off. */}
                          {!!msg.skills?.length && (
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              <Puzzle className="h-3 w-3 shrink-0 text-accent" />
                              {msg.skills.map((s) => (
                                <span
                                  key={s.slug}
                                  className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {showThinking && (
                            <ThinkingBlock
                              reasoning={msg.reasoning || ''}
                              streaming={isStreamingThis}
                              seconds={isStreamingThis ? thinkingSeconds : msg.seconds ?? 0}
                              keyword={thinkingWord}
                              effortLabel={activeEffort.label}
                              status={isStreamingThis ? streamStatus : null}
                              hasAnswer={msg.text.trim().length > 0}
                            />
                          )}

                          {/* Tables get their own scroll rather than widening the
                              bubble; fenced code is handed to CodeBlock, which
                              brings its own surface and scroll container. */}
                          {msg.text.trim().length > 0 && (
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-table:block prose-table:overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownCodeComponents}>{msg.text}</ReactMarkdown>
                            </div>
                          )}

                          {msg.partial && (
                            <div className="mt-1.5 text-[11px] italic text-muted-foreground">
                              Stopped — this answer is incomplete.
                            </div>
                          )}

                          {(msg.toolCalls || []).map((t) => (
                            <ToolActionCard
                              key={t.id}
                              call={t}
                              onConfirm={(id) => confirmToolCall(msg.id, id)}
                              onDismiss={(id) => dismissToolCall(msg.id, id)}
                            />
                          ))}

                          {msg.artifact && (
                            <ArtifactInlineCard
                              artifact={msg.artifact}
                              onOpen={() => {
                                setFocusArtifactId(msg.artifact!.id);
                                setArtifactsOpen(true);
                              }}
                            />
                          )}

                          {/* Copy/retry only once the turn has actually
                              settled — mid-stream text is still moving, and
                              there is nothing to regenerate yet. */}
                          {!isStreamingThis && msg.text.trim().length > 0 && (
                            <div className="mt-1.5 flex items-center gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => copyMessageText(msg.text)}
                                aria-label="Copy response"
                                title="Copy"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => retryMessage(msgIndex)}
                                disabled={isProcessing}
                                aria-label="Regenerate response"
                                title="Retry"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="relative z-10 border-t border-border bg-background/80 backdrop-blur-sm">
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
                      {limitHit === 'tokens'
                        ? "You've used your advisor tokens for this month."
                        : limitHit === 'credits'
                          ? "You've run out of credits."
                          : "You've hit your usage limit."}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {limitHit === 'tokens'
                        ? tokenStatus.resetsAt
                          ? `Chatting should be available again on ${tokenStatus.resetsAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}. A higher plan lifts the cap sooner.`
                          : 'Please try again shortly, or upgrade for higher limits.'
                        : limitHit === 'credits'
                          ? 'Artifact generation still spends credits. Upgrade to keep generating documents.'
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

            {/*
             * The one moment the context window earns a full-width notice: it
             * is nearly full, and there is exactly one thing to do about it.
             * Below that threshold the hairline meter beside the send button is
             * the whole story.
             */}
            <AnimatePresence>
              {usage.level === 'full' && !compacting && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={transition.fast}
                  className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3"
                >
                  <Archive className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">This conversation is nearly full.</div>
                    <div className="text-xs text-muted-foreground">
                      {formatContextTokens(usage.remaining)} of {formatContextTokens(usage.window)}{' '}
                      context left. Compacting replaces it with a summary so you can keep going —
                      the full chat stays in your history.
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={runCompaction}>
                    Compact
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {paletteVisible && matchedCommands.length > 0 && (
                <CommandPalette
                  id="advisor-command-palette"
                  commands={matchedCommands}
                  activeIndex={activeCommandIndex}
                  onPick={acceptCommand}
                  onHover={setCommandIndex}
                />
              )}
            </AnimatePresence>

            <AttachmentChips items={attachments} onRemove={removeAttachment} />

            {/* Clickable follow-ups from the advisor's last reply. */}
            <AnimatePresence>
              {quickReplies.length > 0 && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="mb-2 flex flex-wrap gap-1.5"
                >
                  {quickReplies.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      // No icon. A sparkle on every chip is decoration, and on
                      // a chip that says "Why?" it is decoration pretending to
                      // be meaning.
                      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-accent/50 hover:bg-accent/5"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={handleSubmit}
              onDragEnter={handleComposerDragEnter}
              onDragOver={handleComposerDragOver}
              onDragLeave={handleComposerDragLeave}
              onDrop={handleComposerDrop}
              className={cn(
                'relative flex flex-col rounded-2xl border backdrop-blur-xl bg-card/70 shadow-lg transition-all',
                'border-border/60 focus-within:border-accent/50 focus-within:shadow-xl',
                isListening && 'border-destructive/50 ring-2 ring-destructive/20',
              )}
            >
              {isDraggingFiles && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
                  <span className="text-sm font-medium text-accent">Drop files to upload</span>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handleComposerPaste}
                placeholder={
                  isListening
                    ? 'Listening…'
                    : compacting
                      ? 'Compacting the conversation…'
                      : 'Message Pathforge Advisor, or / for commands…'
                }
                rows={1}
                disabled={compacting}
                role="combobox"
                aria-expanded={paletteVisible && matchedCommands.length > 0}
                aria-controls="advisor-command-palette"
                aria-activedescendant={
                  paletteVisible && matchedCommands.length > 0
                    ? `advisor-command-palette-opt-${activeCommandIndex}`
                    : undefined
                }
                className="w-full min-h-[44px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pt-3 pb-1.5 max-h-[320px] text-sm shadow-none"
              />
              <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
                <ContextMeter usage={usage} onCompact={runCompaction} className="mr-1" />
                <FileUploadButton onFiles={handleFilesSelected} disabled={isProcessing} />

                {/* Model and effort sit alongside the attachment button rather
                    than floating above the box. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title={`Model: ${activeModel.label}`}
                      aria-label={`Model: ${activeModel.label}`}
                      className="group inline-flex items-center justify-center gap-1 rounded-lg px-2 h-8 min-w-8 text-xs font-display font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      <span className="hidden sm:inline">{activeModel.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {ADVISOR_MODELS.map((m) => {
                      const locked = !hasPlan(m.requiredPlan);
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={(e) => {
                            selectModel(m.id);
                            if (locked) e.preventDefault();
                          }}
                          className="flex items-start gap-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              {m.label}
                              {locked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  <Lock className="h-2.5 w-2.5" />
                                  {planForTier(m.requiredPlan).name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{m.blurb}</div>
                            {/* How much conversation this model can hold is now
                                the reason to move up the ladder, so it belongs
                                next to the choice rather than in a tooltip. */}
                            <div className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                              {formatContextTokens(contextWindowFor(m))} context
                            </div>
                          </div>
                          {m.id === activeModel.id && !locked && <Check className="mt-0.5 h-4 w-4 text-accent" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Compact as a closed trigger, full-width as an open panel: the
                    component ties both to one `--effort-width` custom property,
                    so this scopes that property to the two states rather than
                    touching the component itself. */}
                <style>{`
                  .advisor-effort-slider { --effort-width: auto; }
                  .advisor-effort-slider[open],
                  .advisor-effort-slider[data-closing] {
                    --effort-width: min(20rem, calc(100vw - 2rem));
                  }
                `}</style>
                <ClaudeModelSelector
                  className="advisor-effort-slider shrink-0"
                  value={effortSliderIndex}
                  onLevelChange={(_, index) =>
                    selectEffort(EFFORT_SLIDER_LEVELS[index] as AdvisorSettings['reasoning_effort'])
                  }
                />

                <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant={isListening ? 'destructive' : 'ghost'}
                  className="h-11 w-11 sm:h-8 sm:w-8 rounded-lg"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  aria-label={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                </Button>

                {/* Stop replaces send for the whole time a response is in
                    flight. Aborting keeps whatever text already arrived. */}
                {isProcessing || compacting ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-11 w-11 sm:h-8 sm:w-8 rounded-lg"
                    onClick={stopStreaming}
                    aria-label={compacting ? 'Stop compacting' : 'Stop generating'}
                    title={compacting ? 'Stop compacting' : 'Stop generating'}
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 sm:h-8 sm:w-8 rounded-lg"
                    disabled={!canSend}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                </div>
              </div>
            </form>

            {/* Pathforge quick actions — one per Journey phase, standing in for
                a blank box the same way the starter cards used to, just as
                pills under the composer instead of a grid above it. */}
            {messages.length === 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {STARTER_PILLS.map((pill, i) => (
                  <motion.button
                    key={pill.phase}
                    type="button"
                    onClick={() => sendMessage(pill.prompt)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-foreground"
                  >
                    <pill.icon className="h-3.5 w-3.5" />
                    <span>{pill.label}</span>
                  </motion.button>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Type <span className="font-medium text-foreground">/</span> for commands. Pathforge
              Advisor uses AI — verify important information.
            </p>
          </div>
        </div>
      </div>

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

      <SkillsPanel
        open={skillsOpen}
        onOpenChange={setSkillsOpen}
        focus={skillsFocus}
        catalog={skillCatalog}
        installed={installedSkills}
        loading={skillsLoading}
        onInstall={async (slug) => {
          const row = await installFromCatalog(slug);
          toast({ title: `${row.name} installed`, description: 'It loads when a message matches it.' });
          return row;
        }}
        onRemove={async (slug) => {
          const row = await removeSkill(slug);
          toast({ title: `${row.name} removed` });
          return row;
        }}
        onToggle={setSkillEnabled}
        onWriteCustom={async (input) => {
          const row = await installCustom(input);
          toast({ title: `${row.name} installed`, description: `Name it in a message, or type @${row.slug}.` });
          return row;
        }}
      />

      <ArtifactsPanel
        open={artifactsOpen}
        onOpenChange={(v) => {
          setArtifactsOpen(v);
          if (!v) setFocusArtifactId(null);
        }}
        artifacts={artifacts}
        getDownloadUrl={getArtifactDownloadUrl}
        remove={removeArtifact}
        focusArtifactId={focusArtifactId}
      />
    </div>
  );
}
