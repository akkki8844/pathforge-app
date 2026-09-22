/**
 * Follow-up date helpers.
 *
 * Separate from `FollowupComposer` because a module that exports both a
 * component and a plain function breaks React Fast Refresh for that file.
 */

/** Today, in the browser's own timezone, as a date input wants it. */
export function todayValue(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * A default due date, given the deadline the follow-up is about.
 *
 * Chasing a document is only useful while there is still time to act on it, so
 * this lands three days before the deadline rather than on it. A deadline
 * already inside that window, or in the past, falls back to today - suggesting
 * a due date that has been and gone would be worse than suggesting none.
 */
export function suggestedDueDate(deadline?: string | null): string {
  const today = todayValue();
  if (!deadline) return today;
  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return today;
  due.setDate(due.getDate() - 3);
  const local = new Date(due.getTime() - due.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return local > today ? local : today;
}
