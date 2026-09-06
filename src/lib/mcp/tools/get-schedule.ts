import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default defineTool({
  name: "get_schedule",
  title: "Get my schedule",
  description:
    "Fetch the signed-in student's weekly class timetable and their calendar events for the next fourteen days. Use it to know when they are actually free before proposing study time.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const client = sb(ctx);
    const userId = ctx.getUserId();
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 86_400_000);

    const [classesRes, eventsRes] = await Promise.all([
      client
        .from("routine_classes")
        .select("id,subject,teacher,location,days_of_week,start_time,end_time,notes")
        .eq("user_id", userId)
        .eq("is_active", true),
      client
        .from("routine_events")
        .select("id,title,description,category,location,starts_at,ends_at,all_day")
        .eq("user_id", userId)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", horizon.toISOString())
        .order("starts_at", { ascending: true }),
    ]);

    if (classesRes.error) return failed(classesRes.error.message);
    if (eventsRes.error) return failed(eventsRes.error.message);

    const classes = (classesRes.data ?? []).map((c) => ({
      ...c,
      days: (c.days_of_week ?? []).map((d: number) => DAYS[d] ?? String(d)),
    }));
    const todayIndex = now.getDay();

    return ok({
      timezone_note:
        "Class times are stored as local wall-clock times; event times are ISO timestamps.",
      classes,
      classes_today: classes.filter((c) => (c.days_of_week ?? []).includes(todayIndex)),
      events_next_14_days: eventsRes.data ?? [],
    });
  },
});
