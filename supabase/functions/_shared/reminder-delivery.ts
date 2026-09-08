// One delivery path for every reminder in the product.
//
// WHY THIS EXISTS
// Before this module the three reminder senders each chose a channel by
// accident of how they were written: routine deadlines and activity reminders
// emailed and never touched the notification bell, LOR reminders wrote bell
// rows and never emailed. A student could not express a preference about
// either, and the two halves of "remind me" were implemented twice with
// different bugs.
//
// Everything now goes through `deliverReminder`, which:
//   1. reads the student's preference (type enabled? which channel?),
//   2. claims the occurrence so a re-run cannot send twice,
//   3. emails and/or writes a `notifications` row,
//   4. releases the claim if NOTHING was delivered, so a transient mail
//      failure does not permanently swallow the reminder.
//
// It deliberately does not own scheduling, timezone maths, or what counts as
// "due" — those differ per sender and belong to the sender.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendAppEmail } from "./send-app-email.ts";

/** Preference column that gates a reminder type. */
export type ReminderType = "routine_deadline" | "activity" | "lor";

/** Value of user_preferences.reminder_channel. */
export type ReminderChannel = "email" | "in_app" | "both" | "off";

export interface ReminderRecipient {
  userId: string;
  email: string | null;
  /** First name / username, for greeting. */
  name?: string;
  /** IANA zone, already validated by the caller. */
  timezone: string;
  channel: ReminderChannel;
  /** Whether this specific reminder type is switched on. */
  enabled: boolean;
}

export interface DeliverReminderInput {
  admin: SupabaseClient;
  recipient: ReminderRecipient;
  type: ReminderType;
  /**
   * Identity of this exact reminder occurrence, e.g. `activity:2026-09-13`.
   * Two runs producing the same key must mean "the same reminder", or dedup
   * either double-sends or silently suppresses.
   */
  dedupKey: string;
  /** Registered transactional template name. */
  template: string;
  templateData: Record<string, unknown>;
  /** Bell notification copy. Kept separate from the email on purpose — an
   *  email subject and a one-line bell row are not the same sentence. */
  inApp: { title: string; message: string };
}

export interface DeliverReminderResult {
  delivered: boolean;
  email: "sent" | "skipped" | "suppressed" | "failed" | "no_address";
  inApp: "written" | "skipped" | "failed";
  /** Set when nothing was attempted because of preference/dedup. */
  reason?: "type_disabled" | "channel_off" | "already_sent";
}

const EMAIL_CHANNELS: ReminderChannel[] = ["email", "both"];
const IN_APP_CHANNELS: ReminderChannel[] = ["in_app", "both"];

/** Preference column that governs each reminder type. */
const TYPE_PREF_COLUMN: Record<ReminderType, string> = {
  routine_deadline: "notify_deadlines",
  activity: "notify_activities",
  lor: "notify_deadlines",
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * An IANA zone name ICU actually accepts. A zone that has since been retired,
 * or a typo written by an older client, must not take a whole cron run down.
 */
export function safeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** The calendar date (YYYY-MM-DD) that `instant` falls on in `tz`. */
export function zonedDateKey(instant: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0–23) that `instant` falls in, in `tz`. */
export function zonedHour(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

/** Day of week (0=Sunday) that `instant` falls on, in `tz`. */
export function zonedDayOfWeek(instant: Date, tz: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
    .format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** `days` calendar days after a YYYY-MM-DD key. */
export function addDaysToDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Load recipients in bulk: profile (address, name) joined to preferences
 * (channel, per-type switch, timezone).
 *
 * Absent preference row means "never opened Settings". Every notify_* column
 * defaults to true and reminder_channel to 'both', so absent is opted in —
 * which is what the rest of the product already assumes.
 *
 * If the preferences columns from the pending migration do not exist yet, the
 * lookup degrades to defaults rather than skipping every student. That keeps
 * this deployable before the migration lands.
 */
export async function loadRecipients(
  admin: SupabaseClient,
  userIds: string[],
  type: ReminderType,
): Promise<Map<string, ReminderRecipient>> {
  const out = new Map<string, ReminderRecipient>();
  const prefColumn = TYPE_PREF_COLUMN[type];

  for (let i = 0; i < userIds.length; i += 200) {
    const slice = userIds.slice(i, i + 200);

    const { data: profiles, error: profileErr } = await admin
      .from("profiles")
      .select("user_id, email, username, full_name")
      .in("user_id", slice);
    if (profileErr) throw new Error(profileErr.message);

    // Ask for the new columns; fall back to the columns that certainly exist
    // if the migration has not been applied to this project yet.
    let prefRows: Record<string, unknown>[] = [];
    const wide = await admin
      .from("user_preferences")
      .select(`user_id, timezone, reminder_channel, notify_deadlines, notify_activities`)
      .in("user_id", slice);
    if (wide.error) {
      const narrow = await admin
        .from("user_preferences")
        .select("user_id, timezone, notify_deadlines")
        .in("user_id", slice);
      if (narrow.error) {
        console.error("preference lookup failed, using defaults", narrow.error.message);
      }
      prefRows = (narrow.data ?? []) as Record<string, unknown>[];
    } else {
      prefRows = (wide.data ?? []) as Record<string, unknown>[];
    }

    const prefByUser = new Map(prefRows.map((p) => [p.user_id as string, p]));

    for (const p of profiles ?? []) {
      const row = p as { user_id: string; email?: string; username?: string; full_name?: string };
      const pref = prefByUser.get(row.user_id) ?? {};
      const channelRaw = (pref as { reminder_channel?: string }).reminder_channel;
      const channel: ReminderChannel =
        channelRaw === "email" || channelRaw === "in_app" || channelRaw === "off"
          ? channelRaw
          : "both";
      // `!== false` rather than `=== true`: undefined means the column is
      // absent or the row is missing, both of which mean "default on".
      const enabled = (pref as Record<string, unknown>)[prefColumn] !== false;

      out.set(row.user_id, {
        userId: row.user_id,
        email: row.email ?? null,
        name: (row.full_name || "").trim().split(/\s+/)[0] || row.username || undefined,
        timezone: safeZone((pref as { timezone?: string }).timezone),
        channel,
        enabled,
      });
    }
  }

  return out;
}

/**
 * Claim, deliver, and release on total failure.
 *
 * The claim is taken BEFORE any send. `ignoreDuplicates` makes the upsert an
 * ON CONFLICT DO NOTHING, so an empty `.select()` result is the authoritative
 * "somebody already handled this occurrence" — including a concurrent run of
 * the same cron.
 */
export async function deliverReminder(
  input: DeliverReminderInput,
): Promise<DeliverReminderResult> {
  const { admin, recipient, type, dedupKey, template, templateData, inApp } = input;

  if (!recipient.enabled) {
    return { delivered: false, email: "skipped", inApp: "skipped", reason: "type_disabled" };
  }
  if (recipient.channel === "off") {
    return { delivered: false, email: "skipped", inApp: "skipped", reason: "channel_off" };
  }

  const wantsEmail = EMAIL_CHANNELS.includes(recipient.channel);
  const wantsInApp = IN_APP_CHANNELS.includes(recipient.channel);

  // ── Claim ──────────────────────────────────────────────────────────────
  const { data: claimed, error: claimErr } = await admin
    .from("reminder_deliveries")
    .upsert(
      { user_id: recipient.userId, reminder_type: type, dedup_key: dedupKey },
      { onConflict: "user_id,reminder_type,dedup_key", ignoreDuplicates: true },
    )
    .select("id");

  if (claimErr) {
    console.error("reminder claim failed", {
      type,
      dedupKey,
      user: recipient.userId,
      error: claimErr.message,
    });
    return { delivered: false, email: "failed", inApp: "failed" };
  }
  if (!claimed?.length) {
    return { delivered: false, email: "skipped", inApp: "skipped", reason: "already_sent" };
  }
  const claimId = (claimed[0] as { id: string }).id;

  // ── Deliver ────────────────────────────────────────────────────────────
  const channelsSent: string[] = [];

  let emailState: DeliverReminderResult["email"] = "skipped";
  if (wantsEmail) {
    if (!recipient.email) {
      emailState = "no_address";
    } else {
      try {
        // Suppression, bounces and unsubscribes are enforced inside the
        // managed send API — a suppressed recipient comes back as
        // `sent: false`, never as a thrown error, and must never be retried.
        const result = await sendAppEmail(template, recipient.email, {
          idempotencyKey: `${type}:${recipient.userId}:${dedupKey}`,
          templateData,
        });
        if (result.sent) {
          emailState = "sent";
          channelsSent.push("email");
        } else {
          emailState = "suppressed";
        }
      } catch (e) {
        emailState = "failed";
        console.error("reminder email threw", { type, user: recipient.userId, error: String(e) });
      }
    }
  }

  let inAppState: DeliverReminderResult["inApp"] = "skipped";
  if (wantsInApp) {
    // Same row shape the bell already reads and lor-reminders already writes —
    // deliberately not a second notification stack.
    const { error: notifErr } = await admin.from("notifications").insert({
      user_id: recipient.userId,
      title: inApp.title,
      message: inApp.message,
      sender_role: "system",
    });
    if (notifErr) {
      inAppState = "failed";
      console.error("reminder notification insert failed", {
        type,
        user: recipient.userId,
        error: notifErr.message,
      });
    } else {
      inAppState = "written";
      channelsSent.push("in_app");
    }
  }

  // ── Settle ─────────────────────────────────────────────────────────────
  if (channelsSent.length === 0) {
    // A suppressed address is a settled answer, not a transient failure: the
    // student has unsubscribed or hard-bounced, and retrying every hour would
    // be both useless and abusive. Keep the claim so we stop asking.
    const permanent = emailState === "suppressed" || emailState === "no_address";
    if (!permanent) {
      const { error: releaseErr } = await admin
        .from("reminder_deliveries")
        .delete()
        .eq("id", claimId);
      if (releaseErr) {
        console.error("reminder claim release failed", {
          type,
          dedupKey,
          error: releaseErr.message,
        });
      }
    }
    return { delivered: false, email: emailState, inApp: inAppState };
  }

  const { error: markErr } = await admin
    .from("reminder_deliveries")
    .update({ channels: channelsSent })
    .eq("id", claimId);
  if (markErr) {
    // Cosmetic: the claim itself is what prevents a duplicate.
    console.error("reminder channel record failed", { type, error: markErr.message });
  }

  return { delivered: true, email: emailState, inApp: inAppState };
}
