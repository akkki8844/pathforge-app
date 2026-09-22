import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { COUNSELLOR_MAIN, COUNSELLOR_OTHER } from "@/lib/teacher/nav";
import { OPEN_COMMAND_PALETTE } from "@/lib/teacher/commandPalette";

/**
 * Jump to anything, from anywhere in the workspace.
 *
 * A counsellor with eighty students had one way to reach any of them: open
 * Students, scroll or type into the page's own search box, then click. That is
 * three interactions and a page load to answer "what was the score on the
 * student who just emailed me", and it is the single most repeated movement in
 * the job.
 *
 * Cmd+K is the whole feature. It searches the roster by name, email, school
 * and intended major, and the workspace's own pages by name and by the line
 * that describes them, so "who is behind" finds Students and "drafts" finds
 * Essays without knowing what either page is called.
 *
 * It is mounted once in `CounsellorShell`, which is why it works on every
 * counsellor page including ones added later. Nothing needs to opt in.
 */

/** Students shown before anything is typed - long lists are not a menu. */
const RECENT_LIMIT = 6;
/** Matches shown once a query is typed. */
const RESULT_LIMIT = 12;

export function CounsellorCommandPalette() {
  const navigate = useNavigate();
  const { students } = useTeacherRoster();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k") return;
      if (!e.metaKey && !e.ctrlKey) return;
      /*
       * Browsers bind Ctrl+K to the address bar, so this has to claim it. It
       * only does so inside the counsellor workspace, where the shell that
       * mounts this component is the only thing on screen.
       */
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  const destinations = useMemo(
    () => [...COUNSELLOR_MAIN, ...COUNSELLOR_OTHER.flatMap((g) => g.links)],
    [],
  );

  /*
   * cmdk does its own fuzzy filtering on the rendered text, which would only
   * ever see a student's name. Matching here instead means an email address or
   * an intended major finds the student even though neither is on the row, and
   * lets the list stay short when nothing has been typed.
   */
  const matchedStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...students]
        .sort((a, b) => {
          // Behind first: if a counsellor is reaching for somebody without
          // typing, it is usually one of these.
          const rank = (s: string) => (s === "behind" ? 0 : s === "steady" ? 1 : 2);
          return rank(a.status) - rank(b.status) || b.overall_score - a.overall_score;
        })
        .slice(0, RECENT_LIMIT);
    }
    return students
      .filter((s) =>
        `${s.full_name ?? ""} ${s.email ?? ""} ${s.intended_major ?? ""} ${s.high_school_name ?? ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, RESULT_LIMIT);
  }, [students, query]);

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (d) =>
        d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [destinations, query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Find a student, or jump to a page"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          Nothing matches that. Students are searchable by name, email, school or
          intended major.
        </CommandEmpty>

        {matchedStudents.length > 0 && (
          <CommandGroup heading={query.trim() ? "Students" : "Needs you first"}>
            {matchedStudents.map((s) => (
              <CommandItem
                key={s.user_id}
                // The value is what cmdk matches on. Everything searchable goes
                // in so its own filter never contradicts the one above.
                value={`${s.full_name ?? ""} ${s.email ?? ""} ${s.intended_major ?? ""} ${s.user_id}`}
                onSelect={() => go(`/teacher/students/${s.user_id}`)}
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {s.full_name || s.email || "Unnamed student"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.grade, s.intended_major].filter(Boolean).join(" · ") ||
                        "No grade or major set"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {s.overall_score}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {matchedStudents.length > 0 && matchedPages.length > 0 && <CommandSeparator />}

        {matchedPages.length > 0 && (
          <CommandGroup heading="Go to">
            {matchedPages.map((d) => (
              <CommandItem
                key={d.href}
                value={`${d.label} ${d.description}`}
                onSelect={() => go(d.href)}
              >
                <d.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{d.label}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">
                  {d.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <div className="px-3 py-2 text-[11px] text-muted-foreground">
          <CommandShortcut className="ml-0">Esc</CommandShortcut> to close
        </div>
      </CommandList>
    </CommandDialog>
  );
}
