import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Video,
  MapPin, Plus, Users, FileText, CheckCircle2,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useCounsellorInteractions } from "@/hooks/useCounsellorInteractions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "month";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function TeacherMeetings() {
  const { students } = useTeacherRoster();
  const { items: interactions, loading } = useCounsellorInteractions();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const meetings = useMemo(() =>
    interactions.filter((i) => i.kind === "meeting").map((m) => ({
      ...m,
      date: new Date(m.occurred_at),
      studentName: nameMap.get(m.student_id) || "Student",
    })),
    [interactions, nameMap],
  );

  const today = new Date();

  // Week view data
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const weekMeetings = useMemo(() => {
    return meetings.filter((m) => {
      return weekDays.some((d) =>
        m.date.getFullYear() === d.getFullYear() &&
        m.date.getMonth() === d.getMonth() &&
        m.date.getDate() === d.getDate()
      );
    });
  }, [meetings, weekDays]);

  // Month view data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDay, daysInMonth]);

  const getMeetingsForDay = (day: number | null) => {
    if (!day) return [];
    return meetings.filter((m) =>
      m.date.getFullYear() === year &&
      m.date.getMonth() === month &&
      m.date.getDate() === day
    );
  };

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return meetings
      .filter((m) => m.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [meetings]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your counseling sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setView("week")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Calendar navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground ml-2">
              {view === "week"
                ? `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : `${MONTHS[month]} ${year}`
              }
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="border-border/60">
              <CardContent className="p-0">
                {view === "week" ? (
                  /* Week view */
                  <div className="grid grid-cols-7 border-b border-border">
                    {weekDays.map((d, i) => {
                      const isToday = d.toDateString() === today.toDateString();
                      const dayMeetings = weekMeetings.filter((m) =>
                        m.date.getFullYear() === d.getFullYear() &&
                        m.date.getMonth() === d.getMonth() &&
                        m.date.getDate() === d.getDate()
                      );
                      return (
                        <div key={i} className={cn("border-r border-border last:border-r-0 min-h-[200px]", isToday && "bg-accent/5")}>
                          <div className={cn("p-2 text-center border-b border-border", isToday && "bg-accent/10")}>
                            <p className="text-xs text-muted-foreground uppercase">{DAYS[i]}</p>
                            <p className={cn("text-lg font-semibold", isToday ? "text-accent" : "text-foreground")}>
                              {d.getDate()}
                            </p>
                          </div>
                          <div className="p-1 space-y-1">
                            {dayMeetings.map((m) => (
                              <div
                                key={m.id}
                                className="p-1.5 rounded bg-accent/10 border-l-2 border-accent text-xs"
                              >
                                <p className="font-medium text-foreground truncate">{m.studentName}</p>
                                <p className="text-muted-foreground">{formatTime(m.date)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Month view */
                  <div>
                    <div className="grid grid-cols-7 border-b border-border">
                      {DAYS.map((d) => (
                        <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {monthDays.map((day, i) => {
                        const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                        const dayMeetings = getMeetingsForDay(day);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "border-r border-b border-border last:border-r-0 min-h-[80px] p-1",
                              isToday && "bg-accent/5",
                              !day && "bg-muted/20"
                            )}
                          >
                            {day && (
                              <>
                                <p className={cn("text-xs font-medium mb-1", isToday ? "text-accent" : "text-muted-foreground")}>
                                  {day}
                                </p>
                                {dayMeetings.slice(0, 2).map((m) => (
                                  <div key={m.id} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 truncate mb-0.5">
                                    {m.studentName}
                                  </div>
                                ))}
                                {dayMeetings.length > 2 && (
                                  <p className="text-[10px] text-muted-foreground px-1">+{dayMeetings.length - 2} more</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Upcoming */}
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No upcoming meetings</p>
                ) : (
                  upcomingMeetings.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {m.studentName[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {formatTime(m.date)}
                        </p>
                        {m.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.summary}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total meetings</span>
                  <span className="font-medium text-foreground">{meetings.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">This week</span>
                  <span className="font-medium text-foreground">{weekMeetings.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Upcoming</span>
                  <span className="font-medium text-foreground">{upcomingMeetings.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
