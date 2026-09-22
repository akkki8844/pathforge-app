/**
 * Roster export.
 *
 * /teacher/students imported a `Download` icon and never rendered it. The
 * export it stood for did not exist, which is a real gap rather than a
 * cosmetic one: a counsellor writing a progress report, filing something with
 * a head of school, or sanity-checking the list against their own records has
 * no way to get the data out of the page, and a roster of eighty students is
 * not something anybody retypes.
 *
 * The file written is whatever the page is currently showing - the same
 * filtered, sorted list under the search box - because an export that silently
 * ignores the filters produces a spreadsheet that does not match the screen it
 * came from.
 */
import type { RosterStudent } from "@/hooks/useTeacherRoster";

const COLUMNS: { header: string; value: (s: RosterStudent) => string }[] = [
  { header: "Name", value: (s) => s.full_name ?? "" },
  { header: "Email", value: (s) => s.email ?? "" },
  { header: "Grade", value: (s) => s.grade ?? "" },
  { header: "Intended major", value: (s) => s.intended_major ?? "" },
  { header: "School", value: (s) => s.high_school_name ?? "" },
  { header: "Profile score", value: (s) => String(s.overall_score ?? 0) },
  {
    header: "Standing",
    value: (s) =>
      s.status === "behind" ? "At risk" : s.status === "top" ? "Strong" : "On track",
  },
  { header: "Target universities", value: (s) => (s.target_universities ?? []).join("; ") },
];

/**
 * One CSV field.
 *
 * Quoting is not optional here. University lists and school names contain
 * commas, and a name beginning `=`, `+`, `-` or `@` is executed as a formula
 * by Excel and Google Sheets when the file is opened - a roster is exactly the
 * kind of file that gets opened in a spreadsheet, and the names in it come
 * from user input, so the leading apostrophe is a deliberate defusing rather
 * than a formatting quirk.
 */
function field(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** `pathforge-roster-2026-09-21.csv` */
function filename(): string {
  return `pathforge-roster-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function rosterToCsv(students: RosterStudent[]): string {
  const rows = [
    COLUMNS.map((c) => field(c.header)).join(","),
    ...students.map((s) => COLUMNS.map((c) => field(c.value(s))).join(",")),
  ];
  // CRLF, because that is what the CSV spec says and what Excel is least
  // likely to argue with.
  return rows.join("\r\n");
}

export function downloadRosterCsv(students: RosterStudent[]): void {
  // The BOM is what makes Excel read the file as UTF-8 instead of the system
  // codepage. Without it a name with an accent in it arrives mangled.
  const blob = new Blob(["﻿" + rosterToCsv(students)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
