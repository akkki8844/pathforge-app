import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { cn } from "@/lib/utils";
import { accent, accentForName } from "@/lib/comms/accents";
import { displayName, type Person } from "@/hooks/comms/usePeople";
import { useAttachmentUrl } from "@/hooks/comms/useMessages";

/**
 * A person, as a circle.
 *
 * Renders through `PathforgeAvatar`, the same resolver every other identity
 * surface in the app uses (the session rail, the profile menu). A plain
 * `<AvatarImage src={person.avatar_url}>` used to sit here instead, but
 * `avatar_url` is almost never a real image URL — it's a `pf:<face>:<palette>`
 * token (see `src/lib/avatars.ts`) — so the `<img>` tag failed to load on
 * every account and silently fell back to bare initials. `PathforgeAvatar`
 * is the piece that knows how to turn that token into the actual hexagon
 * face; skipping it is exactly what made every avatar in this thread render
 * as letters.
 */
export function PersonAvatar({
  person,
  size = "md",
  online,
  className,
}: {
  person: Person | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Renders a presence dot. Omit entirely where presence isn't tracked. */
  online?: boolean;
  className?: string;
}) {
  const dim = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    // The conversation-list size. Every messenger lands within a pixel or two
    // of 48px here: smaller and a face is not recognisable at a glance, larger
    // and the row stops fitting a preview line beside it.
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  }[size];
  const px = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 }[size];

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span className={cn(dim, "overflow-hidden rounded-full border border-border")}>
        <PathforgeAvatar
          stored={person?.avatar_url}
          seed={person?.user_id ?? displayName(person)}
          size={px}
          className="h-full w-full"
        />
      </span>
      {online !== undefined && (
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            online ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
      )}
      {online !== undefined && (
        <span className="sr-only">{online ? "Online" : "Offline"}</span>
      )}
    </span>
  );
}

/**
 * A group or team conversation, as a tinted tile — or, once someone has set
 * one, the group's own photo.
 *
 * Deliberately square-ish rather than a circle: at a glance in the list, shape
 * is what separates "a person" from "a room", and that reads faster than the
 * label does. The accent tint is still what renders for every group that
 * hasn't set a photo, and it's what a photo crossfades onto if it's still
 * loading, so a group is never left with nothing to show.
 */
export function GroupAvatar({
  title,
  accentName,
  imagePath,
  size = "md",
  className,
}: {
  title: string;
  accentName?: string | null;
  /** `conversations.image_path` — a private `comms-attachments` storage key. */
  imagePath?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tint = accent(accentName ?? accentForName(title));
  const dim = {
    sm: "h-8 w-8 text-xs rounded-lg",
    md: "h-10 w-10 text-sm rounded-xl",
    lg: "h-12 w-12 text-sm rounded-2xl",
    xl: "h-16 w-16 text-lg rounded-2xl",
  }[size];
  const { data: photoUrl } = useAttachmentUrl(imagePath ?? undefined);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-border font-semibold",
        tint.avatar,
        dim,
        className,
      )}
      aria-hidden
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        title.trim().slice(0, 2).toUpperCase() || "#"
      )}
    </span>
  );
}
