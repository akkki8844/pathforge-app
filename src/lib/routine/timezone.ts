import { supabase } from "@/integrations/supabase/client";

/**
 * Keep `user_preferences.timezone` in step with the browser's zone.
 *
 * Every date figure in Routine is computed in the viewer's local zone, which
 * works precisely because there is always a viewer. The deadline-reminder cron
 * has no browser: it has to decide "is this due tomorrow *for this student*"
 * from a stored value, and without one it would mail a student in Auckland
 * about a deadline that, in UTC, is still a day away.
 *
 * So the client — the only party that actually knows — writes it down. Once per
 * change, not once per page load: the localStorage mirror is a cache of what we
 * last wrote, so the common case (same student, same laptop, same country)
 * costs nothing. Travel or a laptop clock change flips it on the next load.
 *
 * Failure is silent by design. A timezone we could not store falls back to the
 * column default of UTC, which sends reminders at a defensible hour rather than
 * not at all, and there is nothing a student could do about an error here.
 */

const CACHE_KEY = "pf_tz_synced";

function browserZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Guard against the empty string some older engines return.
    return zone && zone.length > 1 ? zone : null;
  } catch {
    return null;
  }
}

export async function syncTimezone(userId: string): Promise<void> {
  const zone = browserZone();
  if (!zone) return;

  const cacheKey = `${CACHE_KEY}:${userId}`;
  try {
    if (localStorage.getItem(cacheKey) === zone) return;
  } catch {
    // Private mode with storage disabled: fall through and just write.
  }

  try {
    // Upsert rather than update: a student who has never opened Settings has no
    // preferences row yet, and they should still get their deadline emails at
    // the right hour.
    const { error } = await supabase
      .from("user_preferences" as never)
      .upsert({ user_id: userId, timezone: zone } as never, { onConflict: "user_id" } as never);
    if (error) return;
    try {
      localStorage.setItem(cacheKey, zone);
    } catch {
      /* storage unavailable — we'll just write again next load */
    }
  } catch {
    /* offline or blocked; the column default stands */
  }
}
