import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifyUsageConsumed, useUsage } from '@/contexts/UsageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  VolumeX,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Zap,
  FileBox,
  X,
  Check,
  Lock,
  Sparkles,
  SlidersHorizontal,
  Archive,
  Terminal,
  Compass,
  Hammer,
  PenLine,
  MapPin,
  Copy,
  RotateCcw,
  WifiOff,
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
import { Button } from '@/components/ui/button';
import ClaudeModelSelector from '@/components/ui/claude-model-selector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { usePlanTier } from '@/hooks/usePlanTier';
import { planForTier } from '@/lib/plans';
import { useAdvisorHistory, type ConversationGroup } from '@/hooks/useAdvisorHistory';
import { useAdvisorArtifacts } from '@/hooks/useAdvisorArtifacts';
import { useAdvisorSettings, type AdvisorSettings } from '@/hooks/useAdvisorSettings';
import { useAdvisorSkills } from '@/hooks/useAdvisorSkills';
import { useOutcomesData, type OutcomesProfile } from '@/hooks/useOutcomesData';
import { useRoutineTasks, useRoutineEvents } from '@/hooks/routine/useRoutineData';
import { counsellorDb } from '@/integrations/supabase/counsellor';
import { FileUploadButton } from '@/components/advisor/FileUploadButton';
import { AttachmentChips, type Attachment } from '@/components/advisor/AttachmentChips';
import { ArtifactsPanel } from '@/components/advisor/ArtifactsPanel';
import { ArtifactInlineCard } from '@/components/advisor/ArtifactInlineCard';
import { InlineGeneratedImage } from '@/components/advisor/InlineGeneratedImage';
import { SourceList } from '@/components/advisor/SourceList';
import { MetalSendButton } from '@/components/advisor/MetalSendButton';
import { ImageGeneration } from '@/components/ui/ai-chat-image-generation-1';
import { SessionNavBar } from '@/components/advisor/SessionNavBar';
import { ThinkingBlock, nextThinkingKeyword } from '@/components/advisor/ThinkingBlock';
import { SkillsPanel } from '@/components/advisor/SkillsPanel';
import { ContextMeter } from '@/components/advisor/ContextMeter';
import { CommandPalette } from '@/components/advisor/CommandPalette';
import { ToolActionCard } from '@/components/advisor/ToolActionCard';
import { ToolCallsSection, type ToolCallEntry } from '@/components/ui/tool-calls-section';
import { markdownCodeComponents } from '@/components/advisor/CodeBlock';
import type { AdvisorArtifact } from '@/hooks/useAdvisorArtifacts';
import { ingestFile } from '@/lib/advisorUploads';
import {
  streamAdvisor,
  stripSuggestionMarker,
  AdvisorLimitError,
  type StreamedToolCall,
  type AdvisorSource,
} from '@/lib/advisorStream';
import {
  ADVISOR_MODELS,
  DEFAULT_ADVISOR_MODEL,
  describeServedModel,
  modelFromGateway,
  readStoredModel,
  writeStoredModel,
} from '@/lib/advisorModels';
import { ModelLogo, PoweredBy } from '@/components/advisor/ModelBadge';
import {
  validateToolCall,
  describeCall,
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
type LimitKind = 'allowance' | 'rate' | null;

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
  /** Pages the advisor read for this answer. Only set when a web tool ran. */
  sources?: AdvisorSource[];
  toolCalls?: AdvisorToolCall[];
  /** True when the user pressed stop and this is what had arrived. */
  partial?: boolean;
  /** Installed skills whose instructions were loaded for this answer. */
  skills?: { slug: string; name: string }[];
  /** The model id the server reported for this answer. Not stored with history. */
  model?: string;
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
  /** Whether the composer's tools popover is open. */
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Scope the app-wide keep-alive stack (audio context + worker heartbeat) to
  // only run while a message is actually being generated.
  useKeepAlive(isProcessing);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  // Mobile only: the rail renders as a left drawer under md. Starts closed —
  // on desktop the rail is always docked and this never applies.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop sidebar: open by default — it is the advisor's primary navigation,
  // and a dashboard that starts as an unlabelled strip of icons makes the
  // reader hunt for what the page can do. It collapses to a 64px icon rail
  // from either toggle (the sidebar's own header, or the top bar, which also
  // drives the mobile drawer `sidebarOpen` under md). The choice is remembered
  // per browser so collapsing it does not un-collapse on the next visit.
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem('pf.advisor.sidebar') !== 'collapsed';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('pf.advisor.sidebar', sidebarPinned ? 'open' : 'collapsed');
    } catch {
      /* private mode / storage disabled — the sidebar still works, it just forgets. */
    }
  }, [sidebarPinned]);

  /*
   * The advisor shell fills whatever is left of the viewport below it, and it
   * has to be measured rather than assumed. A hardcoded `100svh - 4rem` is
   * only correct when the navbar is the single thing above the page — but
   * Layout also stacks AnnouncementBanner, EmailVerificationBanner,
   * UsageLimitBanner and GuestModeBanner in there, and the Lovable preview
   * adds a payments-sandbox strip of its own. Every one of those pushed the
   * shell down without shortening it, so the bottom of the sidebar — the
   * Settings row and the account card — was cut off below the fold with no
   * way to scroll to it, since the shell is `overflow-hidden` by design.
   */
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellHeight, setShellHeight] = useState<string>('calc(100svh - 4rem)');
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      // 320px floor: on a very short window a shell smaller than this is
      // unusable anyway, and letting it collapse to nothing hides the composer.
      setShellHeight(`${Math.max(320, Math.round(window.innerHeight - top))}px`);
    };
    measure();
    window.addEventListener('resize', measure);

    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    /*
     * Observing document.body alone was not enough, and the failure was live.
     *
     * The update banner is a `sticky` sibling of <main>, 121px tall, and it
     * mounts AFTER this effect's first measure. It pushes the shell's top edge
     * from 71px to 192px — but it does not change the border-box size of any
     * element the observer was watching, so nothing re-fired. Measured on
     * production: the shell stayed at 550px when the correct value was 429,
     * and dispatching a single resize event snapped it straight to 429.
     *
     * 121px of the advisor then hung below the fold, taking the composer and
     * the sidebar's Settings row with it — and the shell is overflow-hidden by
     * design, so there was no way to scroll down to them.
     *
     * So: watch the column that holds <main>, for children arriving or
     * leaving, and size-observe each sibling above the shell. A banner that
     * mounts, unmounts, or simply rewraps onto another line all re-measure.
     * `childList` only, not `subtree` — the streaming reply mutates this tree
     * on every token and none of that moves the shell.
     */
    const main = el.closest('main');
    const column = main?.parentElement ?? null;
    const observeSiblings = () => {
      if (!column) return;
      for (const child of Array.from(column.children)) {
        // Re-observing an element already observed is a no-op.
        if (child !== main) ro.observe(child);
      }
    };
    observeSiblings();
    const mo = column
      ? new MutationObserver(() => {
          observeSiblings();
          measure();
        })
      : null;
    mo?.observe(column!, { childList: true });

    // One more pass after paint, for anything that lands in the same frame as
    // the first measure.
    const raf = requestAnimationFrame(measure);

    return () => {
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(raf);
      mo?.disconnect();
      ro.disconnect();
    };
  }, []);
  const [limitHit, setLimitHit] = useState<LimitKind>(null);
  /*
   * A toast per failed turn is easy to miss and says nothing about whether
   * this is a one-off blip or the advisor is actually down. Two unrelated
   * failures in a row (not a limit, not an abort — those already have their
   * own banners) upgrades to a persistent notice so a student mid-outage
   * isn't left guessing whether it's them or the service.
   */
  const [advisorDown, setAdvisorDown] = useState(false);
  const consecutiveFailuresRef = useRef(0);
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
  /*
   * What the server is currently waiting on, when it says so.
   *
   * Only images get their own waiting state: generation runs for tens of
   * seconds on the gateway, and a single line of status text for that long
   * reads as a stall. `"image"` swaps it for a reveal over the picture being
   * made. Any other kind, or none at all from an older deployment, falls back
   * to the status line exactly as before.
   */
  const [streamStatusKind, setStreamStatusKind] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const {
    artifacts,
    refresh: refreshArtifacts,
    getDownloadUrl: getArtifactDownloadUrl,
    remove: removeArtifact,
  } = useAdvisorArtifacts(currentConversationId);

  const { updateProfile: updateOutcomesProfile } = useOutcomesData();
  // The advisor writes tasks and events through the Planner's and Calendar's
  // own mutations rather than touching the tables, so a row it creates is
  // indistinguishable from one the student typed and the two lists refresh
  // themselves.
  const { createTask } = useRoutineTasks();
  const { createEvent } = useRoutineEvents();

  const { settings: advisorSettings, loading: settingsLoading, save: saveAdvisorSettings } = useAdvisorSettings();

  // The advisor draws on the same allowance as every other feature now — see
  // `refundIfUnbilled` in supabase/functions/voice-advisor/index.ts for the
  // server side of this.
  const { getResetLabel, getResetTime, refreshUsage } = useUsage();

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
  const { tier: planTier, has: hasPlan } = usePlanTier();

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
    // Nothing to follow on the opening canvas, and pinning it to the bottom
    // scrolls the greeting off the top of a short window — the first thing a
    // student would see is the last row of cards.
    if (messages.length === 0) return;
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
        // add_task / schedule_event — the same mutations the Planner and the
        // Calendar use, so the row lands under RLS with the owner derived from
        // the session and shows up on those pages without a refresh. Both
        // required a click to get here: TOOL_SPECS marks them
        // requiresConfirmation, and nothing ran while the card was pending.
        if (tool.call.name === 'add_task') {
          const t = tool.call.args;
          await createTask({
            title: t.title,
            description: t.description || null,
            due_at: t.dueAt || null,
            priority: t.priority,
          } as never);
          patchToolCall(messageId, tool.id, {
            status: 'done',
            summary: t.dueAt ? 'Added to your tasks, with its due date.' : 'Added to your tasks.',
          });
          return;
        }
        if (tool.call.name === 'schedule_event') {
          const e = tool.call.args;
          await createEvent({
            title: e.title,
            description: e.description || null,
            category: e.category,
            starts_at: e.startsAt,
            ends_at: e.endsAt || null,
            all_day: false,
          } as never);
          patchToolCall(messageId, tool.id, {
            status: 'done',
            summary: 'Added to your calendar.',
          });
          return;
        }
        if (tool.call.name === 'add_application') {
          const a = tool.call.args;
          // `student_id` is not sent: the column defaults to auth.uid() and RLS
          // checks it, so the browser has no say in whose list this lands on.
          const { error } = await counsellorDb.from('student_applications').insert({
            college_name: a.collegeName,
            country: a.country || null,
            application_round: a.round || null,
            deadline: a.deadline || null,
            status: a.status,
          } as never);
          if (error) throw error;
          patchToolCall(messageId, tool.id, {
            status: 'done',
            summary: `${a.collegeName} added to your college list.`,
          });
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
    [createEvent, createTask, installFromCatalog, navigate, patchToolCall, removeSkill, updateOutcomesProfile],
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
      setStreamStatusKind(null);
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
            onStatus: (label, kind) => {
              setStreamStatus(label);
              setStreamStatusKind(kind ?? null);
            },
            onTool: registerTool,
            onArtifact: () => void refreshArtifacts(),
            // Attached to the bubble the moment the search returns, so the
            // pages being read are on screen while the answer is still being
            // written from them.
            onSources: (sources) =>
              setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, sources } : m))),
            onSkills: (skills) =>
              setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, skills } : m))),
            onModel: (model) =>
              setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, model } : m))),
          },
          controller.signal,
        );

        // Every turn draws on the same allowance as the rest of the app now,
        // so the shared usage meter just needs telling a turn happened.
        notifyUsageConsumed();
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
                  sources: result.sources.length ? result.sources : m.sources,
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

        consecutiveFailuresRef.current = 0;
        setAdvisorDown(false);
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === 'AbortError';

        if (isAbort) {
          // Stopping keeps what arrived — the turn was already charged at the
          // gate regardless of how much of the answer the student stayed for.
          notifyUsageConsumed();
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
          notifyUsageConsumed();
          void refreshUsage();
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
          // The message never went anywhere — the composer cleared it on send,
          // so without this a student who typed a real question loses it the
          // moment the service hiccups and has to reconstruct it from memory.
          setTextInput(cleaned);
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) setAdvisorDown(true);
        }
      } finally {
        // A flush queued for the next frame is harmless here: it maps over the
        // current list and cannot re-add a message that was removed.
        abortRef.current = null;
        setStreamingId(null);
        setStreamStatus(null);
        setStreamStatusKind(null);
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
      refreshUsage,
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
              `**${formatContextTokens(usage.used)} used** of ${formatContextTokens(usage.window)} — ${formatContextTokens(usage.remaining)} left.`,
              ``,
              `- **This conversation** — ${formatContextTokens(usage.transcript)}`,
              `- **Instructions and your profile** — ${formatContextTokens(SYSTEM_OVERHEAD_TOKENS)}${skillLine}`,
              ``,
              `The window is how much of the conversation the advisor can still see. It is not a balance and it does not draw on your allowance. When it fills, run \`/compact\`.`,
              ``,
              `You are on **${activeModel.label}** (${activeModel.modelName}), which holds ${formatContextTokens(usage.window)}.`,
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
                  `- \`/model ${m.id}\` — **${m.label}**, powered by ${m.modelName}${m.id === activeModel.id ? ' *(current)*' : ''}. ${m.blurb}. Holds ${formatContextTokens(contextWindowFor(m))} of context.${hasPlan(m.requiredPlan) ? '' : ` Needs ${planForTier(m.requiredPlan).name}.`}`,
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

  // Everything the session rail needs. The rail itself owns its collapsed /
  // expanded chrome and its own mobile drawer.
  const sessionNavProps = {
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
    user: {
      id: user?.id ?? null,
      name: profile?.full_name?.trim() || 'Your account',
      email: profile?.email ?? user?.email ?? null,
      // Passed through verbatim: it is either a `pf:face:palette` token or a
      // legacy uploaded-photo URL, and PathforgeAvatar resolves both.
      avatarUrl: profile?.avatar_url ?? null,
      plan: planForTier(planTier).name,
    },
    onOpenProfile: () => navigate('/profile'),
  };

  return (
    <div
      ref={shellRef}
      style={{ height: shellHeight }}
      /* `advisor-shell` is what declares the --adv-* colour pairs for this
         page (see index.css). Every surface below reads them, so light and
         dark are decided in one place rather than per component. */
      className="advisor-shell flex min-h-0 overflow-hidden bg-[hsl(var(--adv-canvas))]"
    >
      <Seo
        title="Advisor"
        description="Talk or chat with your Pathforge AI advisor for instant, personalized college application guidance."
        path="/advisor"
      />

      {/*
       * The advisor sidebar. Docked and open by default, collapsible to an
       * icon rail from its own header or the top bar; on small screens it
       * renders itself as a left drawer instead.
       */}
      <SessionNavBar
        {...sessionNavProps}
        pinned={sidebarPinned}
        onPinnedChange={setSidebarPinned}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />

      {/* Main chat area */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* No ambient wash behind this pane. Three blurred colour blobs under
            a reading surface tint the type, cost a full-viewport composite on
            every scroll, and say nothing — the page is a document, and a
            document's background is paper. */}

        {/* Top bar */}
        <div className="relative z-10 flex h-14 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              /* Mobile only. On desktop the sidebar carries its own collapse
                 control in its header, and a second identical panel icon a
                 few pixels away in the top bar just reads as clutter. */
              className="h-11 w-11 rounded-full md:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            {/* Which chat you are in. The sidebar highlights it too, but the
                sidebar can be collapsed, and an unlabelled pane with no title
                is the thing that made this read as a bare canvas rather than a
                workspace. */}
            {/* The title is a label for the pane, not a headline — medium
                weight at body size, so it names the chat without competing
                with the conversation under it. */}
            <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">
              {conversations.find((c) => c.conversation_id === currentConversationId)?.name ??
                'New chat'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8 rounded-full relative"
              onClick={() => setSkillsOpen(true)}
              aria-label="Open skills"
              title="Skills"
            >
              <Puzzle className="h-4 w-4" />
              {/* A dot, not a filled counter. The exact number of enabled
                  skills is in the panel this button opens; out here the only
                  question is whether any are on. */}
              {enabledSkillCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8 rounded-full relative"
              onClick={() => setArtifactsOpen(true)}
              aria-label="Open artifacts"
              title="Artifacts"
            >
              <FileBox className="h-4 w-4" />
              {artifacts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-8 sm:w-8 rounded-full"
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
            /*
             * The opening canvas: a greeting, then four things worth asking.
             *
             * Left-aligned and top-weighted rather than vertically centred —
             * the cards, the greeting and the composer all share one left edge,
             * so the column reads as a single object instead of three centred
             * rows that drift apart as the viewport grows.
             */
            <div className="mx-auto w-full max-w-3xl px-6 pt-6 sm:pt-10 xl:pt-20">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transition.base}
                className="font-display text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] md:text-[40px] xl:text-[52px]"
              >
                <span className="advisor-greeting">
                  {(() => {
                    const first = (profile?.full_name?.split(' ')[0] || '').trim();
                    return first ? `Hello, ${first}` : 'Hello';
                  })()}
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, ...transition.base }}
                className="mt-1 font-display text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-[hsl(var(--adv-ink-soft))] md:text-[40px] xl:text-[52px]"
              >
                How can I help you today?
              </motion.p>

              {/*
                * Four cards, one per Journey phase. Each carries that phase's
                * real opening question — the same prompt the pill row sent —
                * so the preview under the title is the text that will actually
                * be asked, not a mock of an answer the advisor has not given.
                */}
              <div className="mt-8 grid grid-cols-2 gap-3 xl:mt-12 xl:grid-cols-4">
                {STARTER_PILLS.map((card, i) => (
                  <motion.button
                    key={card.phase}
                    type="button"
                    onClick={() => sendMessage(card.prompt)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.04, ...transition.base }}
                    className="group relative flex h-[168px] flex-col rounded-xl bg-[hsl(var(--adv-chip))] p-4 text-left transition-colors duration-150 hover:bg-[hsl(var(--adv-chip-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-[14px] font-medium leading-snug text-foreground">
                      {card.label}
                    </span>
                    <span className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[hsl(var(--adv-ink-soft))]">
                      {card.prompt}
                    </span>
                    {/* The icon sits in its own tile in the corner, the way the
                        reference puts a small preview under each title. */}
                    <span className="mt-auto inline-flex h-8 w-8 items-center justify-center self-end rounded-full bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                      <card.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-6 py-6">
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownCodeComponents}>{msg.text}</ReactMarkdown>
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
                          // A solid, fully-rounded pill — the same shape a
                          // sent message takes in Gemini's own thread.
                          ? 'max-w-[85%] rounded-3xl bg-secondary px-4 py-2.5 text-foreground'
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

                          {/* A call the user still has to decide on, or one
                              that failed, keeps its own card — those need to be
                              read. Everything that ran and finished collapses
                              into one receipt line, openable for the arguments
                              and the result. */}
                          {(msg.toolCalls || [])
                            .filter((t) => t.status !== 'done')
                            .map((t) => (
                              <ToolActionCard
                                key={t.id}
                                call={t}
                                onConfirm={(id) => confirmToolCall(msg.id, id)}
                                onDismiss={(id) => dismissToolCall(msg.id, id)}
                              />
                            ))}

                          {(() => {
                            const settled = (msg.toolCalls || []).filter((t) => t.status === 'done');
                            if (settled.length === 0) return null;
                            const entries: ToolCallEntry[] = settled.map((t) => ({
                              toolName: t.name,
                              message: t.summary || describeCall(t.call),
                              inputs: t.call.args as unknown as Record<string, unknown>,
                              output: t.error || null,
                            }));
                            return <ToolCallsSection calls={entries} className="mt-1.5" />;
                          })()}

                          {/* The image does not exist yet — there is nothing
                              to reveal, so the reveal stays shut over a plain
                              surface and the line above it says what is
                              happening. It is replaced by the artifact card the
                              moment the real picture arrives. */}
                          {isStreamingThis && streamStatusKind === 'image' && !msg.artifact && (
                            <ImageGeneration
                              className="mt-2 w-full max-w-sm"
                              done={false}
                              labels={{
                                starting: 'Setting up.',
                                generating: 'Creating your image. This takes a moment.',
                                completed: 'Image ready.',
                              }}
                            >
                              <div className="aspect-[4/3] w-full bg-gradient-to-br from-muted via-secondary/60 to-muted" />
                            </ImageGeneration>
                          )}

                          {/* An image is shown here; everything else is a card that
                              opens the Artifacts panel. Images are no longer
                              listed in that panel, so a card for one would
                              open a panel that does not contain it. */}
                          {msg.artifact && (
                            msg.artifact.kind === 'image' ? (
                              <InlineGeneratedImage artifact={msg.artifact} />
                            ) : (
                              <ArtifactInlineCard
                                artifact={msg.artifact}
                                onOpen={() => {
                                  setFocusArtifactId(msg.artifact!.id);
                                  setArtifactsOpen(true);
                                }}
                              />
                            )
                          )}

                          {/* What the answer was built from. Above the
                              copy/retry row rather than below it, because it
                              belongs to the answer and those controls act on
                              it. */}
                          {msg.sources && msg.sources.length > 0 && (
                            <SourceList sources={msg.sources} />
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
                              {/* Which model actually wrote this answer, by
                                  name and mark. Read from what the server
                                  reported for the turn, so a fallback is
                                  named as the model it fell back to. */}
                              {(() => {
                                const served = describeServedModel(msg.model);
                                return served ? (
                                  <PoweredBy
                                    vendor={served.vendor}
                                    name={served.name}
                                    className="ml-2 text-[11px]"
                                  />
                                ) : null;
                              })()}
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
        <div className="relative z-10 border-t border-border/70 bg-background">
          <div className="mx-auto w-full max-w-3xl px-6 py-4">
            <AnimatePresence>
              {advisorDown && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive">
                    <WifiOff className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">The advisor can't reach its AI service right now.</div>
                    <div className="text-xs text-muted-foreground">
                      This isn't about your account or usage — it's a service outage on our end. Please try again shortly.
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      consecutiveFailuresRef.current = 0;
                      setAdvisorDown(false);
                    }}
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
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
                      {limitHit === 'allowance'
                        ? "You have used 100% of your allowance."
                        : "You've hit your usage limit."}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {limitHit === 'allowance'
                        ? `${getResetLabel()} · in ${getResetTime()}. Upgrade for a larger pool sooner.`
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
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-left text-[12.5px] text-muted-foreground transition-colors duration-100 hover:bg-foreground/[0.045] hover:text-foreground"
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
              /* A writing surface, not a capsule. The old box was a 28px pill
                 in 70%-opacity glass under a large drop shadow: three effects
                 doing the work one hairline does. Focus is now a ring rather
                 than a deeper shadow, which is also the only state a keyboard
                 user can perceive. */
              /* A pill on the soft field colour, not a bordered card. The
                 radius is a fixed 28px rather than `rounded-full` so the shape
                 stays a capsule at one line and becomes a rounded box as the
                 textarea grows — `rounded-full` on a 200px-tall box bows the
                 sides. */
              className={cn(
                'group relative isolate flex flex-col rounded-[28px] border border-transparent bg-[hsl(var(--adv-field))] p-2 transition-[border-color,box-shadow] duration-150',
                'focus-within:border-foreground/15 focus-within:ring-1 focus-within:ring-foreground/10',
                isListening && 'border-destructive/60 ring-1 ring-destructive/25',
              )}
            >
              {isDraggingFiles && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[28px] border border-dashed border-accent bg-card/95">
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
                      : 'Enter a prompt here'
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
                className="w-full min-h-12 max-h-[320px] resize-none border-0 bg-transparent p-3 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {/*
               * The control strip, in the shape a chat composer has settled
               * on: a round attach button and one tools pill on the left, the
               * send affordance pinned right, nothing loose in between.
               *
               * Model, reasoning effort and the context meter used to sit in
               * this row as peers of the attach button. Five controls in a
               * line read as five equally important choices, and they are not
               * — you attach a file or you send, many times a session, and you
               * change model once a month. So they moved inside the tools
               * popover. Nothing was removed: the same model list and the same
               * effort slider render there, which is also why the row no
               * longer needs `flex-wrap` to survive the slider opening.
               */}
              <div className="mt-0.5 flex items-center gap-2 p-1 pt-0">
                <FileUploadButton onFiles={handleFilesSelected} disabled={isProcessing} />

                <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Tools"
                      title="Model, reasoning and session tools"
                      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Tools</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    /* Wider than a menu because the effort slider expands to
                       fill it, and capped to the viewport so it stays on a
                       phone. */
                    className="w-[min(22rem,calc(100vw-2rem))] p-2"
                  >
                    <div className="px-2 pb-1 pt-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Model
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {ADVISOR_MODELS.map((m) => {
                        const locked = !hasPlan(m.requiredPlan);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              selectModel(m.id);
                              if (!locked) setToolsOpen(false);
                            }}
                            className="flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
                          >
                            <ModelLogo vendor={m.vendor} className="mt-0.5 h-4 w-4" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                {m.label}
                                <span className="font-normal text-muted-foreground">{m.modelName}</span>
                                {locked && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Lock className="h-2.5 w-2.5" />
                                    {planForTier(m.requiredPlan).name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{m.blurb}</div>
                              <div className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                {formatContextTokens(contextWindowFor(m))} context
                              </div>
                            </div>
                            {m.id === activeModel.id && !locked && (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="my-2 h-px bg-border" />

                    <div className="px-2 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Reasoning — {activeEffort.label}
                    </div>
                    {/* The slider is width-driven by a custom property the
                        component reads; inside a popover it should simply fill
                        it, so the property is pinned rather than toggled. */}
                    <style>{`
                      .advisor-effort-slider { --effort-width: 100%; }
                    `}</style>
                    <ClaudeModelSelector
                      className="advisor-effort-slider w-full"
                      value={effortSliderIndex}
                      onLevelChange={(_, index) =>
                        selectEffort(EFFORT_SLIDER_LEVELS[index] as AdvisorSettings['reasoning_effort'])
                      }
                    />
                  </PopoverContent>
                </Popover>

                {/*
                 * The active-tool chip. It appears only when reasoning is set
                 * above the lowest station, because that is the one setting in
                 * the popover that silently changes what every later reply
                 * costs and how long it takes — worth a standing reminder on
                 * the strip. Its X returns to the default rather than opening
                 * anything, the same as dismissing a tool.
                 */}
                {effortSliderIndex > 0 && (
                  <>
                    <div aria-hidden className="h-4 w-px shrink-0 bg-border" />
                    <button
                      type="button"
                      onClick={() => selectEffort(EFFORT_SLIDER_LEVELS[0] as AdvisorSettings['reasoning_effort'])}
                      title={`Reasoning: ${activeEffort.label}. Click to reset.`}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm text-accent transition-colors hover:bg-muted"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">{activeEffort.label}</span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                {/* The meter belongs to the send cluster, not to the gap: it is
                    read at the moment you decide whether to send. `ml-auto` lives
                    here alone so the free space collects once, ahead of the whole
                    right-hand group - two `ml-auto` siblings split it and left the
                    ring stranded mid-row. */}
                <ContextMeter usage={usage} onCompact={runCompaction} className="ml-auto shrink-0" />

                <div className="flex shrink-0 items-center gap-1">
                {/*
                 * One primary action, not two — the same toggle Gemini's own
                 * composer uses: mic while the box is empty, a filled send
                 * circle the moment there's something to send. Recording and
                 * an in-flight turn each still get their own explicit stop.
                 */}
                {isProcessing || compacting ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-11 w-11 sm:h-8 sm:w-8 rounded-full"
                    onClick={stopStreaming}
                    aria-label={compacting ? 'Stop compacting' : 'Stop generating'}
                    title={compacting ? 'Stop compacting' : 'Stop generating'}
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                ) : isListening ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-11 w-11 sm:h-8 sm:w-8 rounded-full"
                    onClick={stopListening}
                    aria-label="Stop recording"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                ) : canSend ? (
                  /* Metal only on send. It is the one control in this strip
                     that is a commitment rather than a mode change, and it
                     only exists once there is something to send — so the
                     shader is never running behind an empty composer. Mic and
                     Stop stay plain; three metal discs in one row would be
                     decoration. */
                  <MetalSendButton />
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 sm:h-8 sm:w-8 rounded-full"
                    onClick={startListening}
                    aria-label="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                </div>
              </div>
            </form>

            <p className="mt-3 text-center text-[11px] text-[hsl(var(--adv-ink-soft))]">
              <PoweredBy vendor={activeModel.vendor} name={activeModel.modelName} className="mr-1.5 align-middle" />
              <span aria-hidden="true">&middot;</span> Type <span className="font-medium text-foreground">/</span> for
              commands. AI can make mistakes, so double-check its responses.
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
