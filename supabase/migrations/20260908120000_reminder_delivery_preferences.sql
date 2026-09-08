-- Reminder delivery: one preference surface, one dedup ledger, two channels.
--
-- WHAT WAS ACTUALLY WRONG
-- The repo already had three reminder senders, and each of them independently
-- decided how a student hears from it:
--
--   send-routine-deadline-reminders  email only  (timezone-correct, DB-deduped)
--   send-activity-reminders          email only  (UTC-shaped, no dedup ledger,
--                                                 ignored every preference)
--   lor-reminders                    in-app only (writes notifications rows,
--                                                 never emails)
--
-- So "every user gets reminders on email" was false for LOR, "app users get
-- notifications" was false for deadlines and activities, and no student could
-- express a preference about either. The columns below make the channel a
-- property of the student rather than of whichever function happens to fire,
-- and reminder_deliveries gives the senders that lack one a claim ledger with
-- the same shape routine_deadline_notifications already proved out.
--
-- Additive only: no column is dropped, no default changes an existing row's
-- observable behaviour. reminder_channel defaults to 'both', which is what the
-- product already implicitly promised.

-- ── Preferences ──────────────────────────────────────────────────────────

ALTER TABLE public.user_preferences
  -- Activity/planner reminders were being sent with no opt-out at all. A
  -- default of true preserves today's behaviour for existing rows while
  -- finally giving the student a switch.
  ADD COLUMN IF NOT EXISTS notify_activities boolean NOT NULL DEFAULT true,
  -- Which channel a reminder may use. Deliberately one setting for all
  -- reminder types: a per-type channel matrix is four times the UI for a
  -- distinction nobody has asked for, and it is the kind of thing that ends up
  -- half-respected by one sender and ignored by another.
  ADD COLUMN IF NOT EXISTS reminder_channel text NOT NULL DEFAULT 'both';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_reminder_channel_check'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_reminder_channel_check
      CHECK (reminder_channel IN ('email', 'in_app', 'both', 'off'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_preferences.notify_activities IS
  'Whether planner/activity reminders may be sent at all. Separate from notify_deadlines, which governs Routine deadlines and LOR due dates.';
COMMENT ON COLUMN public.user_preferences.reminder_channel IS
  'How reminders reach this student: email, in_app (notification bell), both, or off. Enforced server-side in _shared/reminder-delivery.ts -- a preference the sender ignores is worse than no preference.';

-- ── Dedup ledger ─────────────────────────────────────────────────────────
--
-- routine_deadline_notifications already does this for Routine, keyed on
-- (source_table, source_id, lead_days, due_at). This is the same idea for the
-- senders that had nothing: claim before you send, release if the send fails.
--
-- `dedup_key` is composed by the caller and is the whole identity of "this
-- exact reminder, this exact occurrence" -- e.g.
--   activity:2026-09-13            (one planner nudge per user per local day)
--   lor:<recommender_id>:t7        (one LOR nudge per stage)
-- Keeping it a single opaque text column rather than a wide composite key is
-- what lets one table serve senders whose notions of "occurrence" differ.

CREATE TABLE IF NOT EXISTS public.reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  dedup_key text NOT NULL,
  -- What actually went out, for support questions like "did you email me?".
  channels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminder_deliveries_unique UNIQUE (user_id, reminder_type, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_user_created
  ON public.reminder_deliveries (user_id, created_at DESC);

ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;

-- Students may read their own delivery history; nobody writes from the client.
-- The senders run under the service role, which bypasses RLS entirely, so the
-- absence of an INSERT/UPDATE/DELETE policy is the enforcement, not an
-- oversight.
DROP POLICY IF EXISTS "Users view own reminder deliveries" ON public.reminder_deliveries;
CREATE POLICY "Users view own reminder deliveries"
  ON public.reminder_deliveries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.reminder_deliveries IS
  'Claim-before-send ledger for reminder senders that lack a dedicated one. A row exists because a reminder was CLAIMED; senders delete it again when delivery fails, so a transient mail error cannot permanently swallow a reminder.';

-- ── Retention ────────────────────────────────────────────────────────────
-- Without this the ledger grows forever: one row per user per reminder per
-- occurrence. Nothing reads a claim older than the longest lead time (30 days),
-- so anything past 90 days is pure storage cost.

CREATE OR REPLACE FUNCTION public.prune_reminder_deliveries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.reminder_deliveries
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_reminder_deliveries() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_reminder_deliveries() FROM anon, authenticated;

-- ── Scheduling (MUST BE APPLIED IN THE LIVE PROJECT) ─────────────────────
--
-- pg_cron jobs are registered against a live database, not from a migration
-- file -- re-running cron.schedule from a migration on every deploy creates
-- duplicate jobs. Run these once in the SQL editor and report the resulting
-- cron.job rows back.
--
-- Both reminder crons are HOURLY on purpose. Each sender gates on the
-- student's own local morning window, which a daily UTC cron physically
-- cannot deliver correctly to more than one timezone. The dedup ledger is
-- what makes the other 23 runs free.
--
--   SELECT cron.schedule(
--     'send-routine-deadline-reminders', '0 * * * *',
--     $$ SELECT net.http_post(
--          url := '<PROJECT_URL>/functions/v1/send-routine-deadline-reminders',
--          headers := jsonb_build_object(
--            'Content-Type', 'application/json',
--            'Authorization', 'Bearer <SERVICE_ROLE_KEY>')
--        ); $$);
--
--   SELECT cron.schedule(
--     'send-activity-reminders', '0 * * * *',
--     $$ SELECT net.http_post(
--          url := '<PROJECT_URL>/functions/v1/send-activity-reminders',
--          headers := jsonb_build_object(
--            'Content-Type', 'application/json',
--            'Authorization', 'Bearer <SERVICE_ROLE_KEY>')
--        ); $$);
--
--   SELECT cron.schedule(
--     'lor-reminders', '0 * * * *',
--     $$ SELECT net.http_post(
--          url := '<PROJECT_URL>/functions/v1/lor-reminders',
--          headers := jsonb_build_object(
--            'Content-Type', 'application/json',
--            'Authorization', 'Bearer <SERVICE_ROLE_KEY>')
--        ); $$);
--
--   SELECT cron.schedule(
--     'prune-reminder-deliveries', '30 3 * * 0',
--     $$ SELECT public.prune_reminder_deliveries(); $$);
--
-- Then verify, and report the rows back rather than assuming:
--   SELECT jobname, schedule, active FROM cron.job
--   WHERE jobname IN ('send-routine-deadline-reminders','send-activity-reminders',
--                     'lor-reminders','prune-reminder-deliveries');
