import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Clock, CalendarDays, ExternalLink, AlertCircle, ArrowRight, XCircle, BookOpen, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshIcon } from "@/components/icons/FlatIcons";
import {
  getRelevantCompetitions,
  daysUntil,
  formatDate,
  type CompetitionWindow,
} from "@/lib/competitionCalendar";

interface Props {
  country: string;
  major: string;
  grade: string;
}

type StatusFilter = "all" | "open" | "upcoming" | "closed";
type FormatFilter = "all" | "online" | "in-person" | "hybrid";
type CostFilter = "all" | "free" | "paid";

function CompetitionCard({ comp, isOngoing, isClosed, reopenInfo }: { comp: CompetitionWindow; isOngoing: boolean; isClosed?: boolean; reopenInfo?: string }) {
  const regCloseDate = comp.registrationClose;
  const compStartDate = comp.competitionStart;
  const daysLeft = regCloseDate ? daysUntil(regCloseDate) : compStartDate ? daysUntil(compStartDate) : null;
  const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
  const [showResources, setShowResources] = useState(false);

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isClosed
        ? "border-muted bg-muted/30 opacity-70"
        : isUrgent ? "border-destructive/40 bg-destructive/5" : "border-border/50 bg-card"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-foreground">{comp.name}</span>
            {isOngoing && regCloseDate && daysLeft !== null && daysLeft > 0 && (
              <Badge variant={isUrgent ? "destructive" : "outline"} className="text-[10px] px-1.5 py-0 h-4">
                {isUrgent && <AlertCircle className="h-2.5 w-2.5 mr-0.5" />}
                {daysLeft}d left to register
              </Badge>
            )}
            {!isOngoing && !isClosed && compStartDate && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/30 text-accent">
                Starts {formatDate(compStartDate)}
              </Badge>
            )}
            {isClosed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                Closed this cycle
              </Badge>
            )}
            {comp.format && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {comp.format}
              </Badge>
            )}
            {comp.cost && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${comp.cost === "free" ? "border-green-300 text-green-700 dark:text-green-400" : ""}`}>
                {comp.cost}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {comp.category} · {comp.country.length === 0 ? "Global" : comp.country.join(", ")}
          </p>
          {comp.eligibility && (
            <p className="text-[11px] text-muted-foreground mb-1">
              <span className="font-medium">Eligibility:</span> {comp.eligibility}
            </p>
          )}
          {comp.notes && (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-2">{comp.notes}</p>
          )}
          {isClosed && reopenInfo && (
            <p className="text-[11px] text-accent font-medium mb-2 inline-flex items-center gap-1">
              <RefreshIcon className="h-4 w-4 shrink-0" /> {reopenInfo}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            {comp.registrationOpen && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Reg: {formatDate(comp.registrationOpen)} – {comp.registrationClose ? formatDate(comp.registrationClose) : "TBD"}
              </span>
            )}
            {comp.competitionStart && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Event: {formatDate(comp.competitionStart)}{comp.competitionEnd && comp.competitionEnd !== comp.competitionStart ? ` – ${formatDate(comp.competitionEnd)}` : ""}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {comp.relevantMajors.slice(0, 4).map(m => (
              <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{m}</span>
            ))}
          </div>

          {/* Study Resources */}
          {comp.studyResources && comp.studyResources.length > 0 && (
            <Collapsible open={showResources} onOpenChange={setShowResources}>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-accent hover:underline mt-2 font-medium">
                <BookOpen className="h-3 w-3" />
                Study Resources ({comp.studyResources.length})
                {showResources ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 space-y-1">
                {comp.studyResources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-accent transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {res.label}
                  </a>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-7 gap-1"
            onClick={() => window.open(comp.url, "_blank")}
          >
            Info <ExternalLink className="h-2.5 w-2.5" />
          </Button>
          {comp.applyUrl && isOngoing && (
            <Button
              size="sm"
              className="text-[10px] h-7 gap-1 btn-accent"
              onClick={() => window.open(comp.applyUrl!, "_blank")}
            >
              Register <ArrowRight className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CompetitionSections({ country, major, grade }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [costFilter, setCostFilter] = useState<CostFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { ongoing, upcoming, closed } = useMemo(
    () => getRelevantCompetitions(country, major, grade),
    [country, major, grade]
  );

  // Apply filters
  const filterComp = (comp: CompetitionWindow) => {
    if (formatFilter !== "all" && comp.format && comp.format !== formatFilter) return false;
    if (costFilter !== "all" && comp.cost && comp.cost !== costFilter) return false;
    return true;
  };

  const filteredOngoing = statusFilter === "all" || statusFilter === "open" ? ongoing.filter(filterComp) : [];
  const filteredUpcoming = statusFilter === "all" || statusFilter === "upcoming" ? upcoming.filter(filterComp) : [];
  const filteredClosed = statusFilter === "all" || statusFilter === "closed" ? closed.filter(filterComp) : [];

  if (ongoing.length === 0 && upcoming.length === 0 && closed.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3 w-3" />
          Filters
          {(statusFilter !== "all" || formatFilter !== "all" || costFilter !== "all") && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 ml-1">Active</Badge>
          )}
        </Button>
        {showFilters && (
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open Now</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as FormatFilter)}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={costFilter} onValueChange={(v) => setCostFilter(v as CostFilter)}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue placeholder="Cost" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Ongoing / Registration Open */}
      {filteredOngoing.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Open Now — Register Before It's Too Late</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">{filteredOngoing.length}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            These competitions are currently accepting registrations or are actively running.
          </p>
          <div className="space-y-3">
            {filteredOngoing.map((comp, i) => (
              <motion.div
                key={comp.activityId}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <CompetitionCard comp={comp} isOngoing={true} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upcoming */}
      {filteredUpcoming.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-highlight" />
            <h3 className="font-semibold text-foreground text-sm">Coming Up — Plan Ahead</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">{filteredUpcoming.length}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            These opportunities are approaching. Start preparing now so you're ready when registration opens.
          </p>
          <div className="space-y-3">
            {filteredUpcoming.map((comp, i) => (
              <motion.div
                key={comp.activityId}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <CompetitionCard comp={comp} isOngoing={false} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Closed this cycle */}
      {filteredClosed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-elevated rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">Closed This Cycle</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">{filteredClosed.length}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            These competitions have closed for the current cycle. Plan ahead for the next round.
          </p>
          <div className="space-y-3">
            {filteredClosed.map((comp, i) => (
              <motion.div
                key={comp.activityId}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <CompetitionCard comp={comp} isOngoing={false} isClosed={true} reopenInfo={(comp as any).reopenInfo} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
