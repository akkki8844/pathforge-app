import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { accent, accentForName } from "@/lib/comms/accents";
import { displayName, initials, type Person } from "@/hooks/comms/usePeople";

/**
 * A person, as a circle.
 *
 * The fallback tint is derived from the person's name rather than picked at
 * random, so the same person is the same colour on every surface in the product
 * — which is most of what makes a list of avatars scannable when several people
 * have no uploaded picture.
 */
export function PersonAvatar({
  person,
  size = "md",
  online,
  className,
}: {
  person: Person | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  /** Renders a presence dot. Omit entirely where presence isn't tracked. */
  online?: boolean;
  className?: string;
}) {
  const name = displayName(person);
  const tint = accent(accentForName(name));
  const dim = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  }[size];

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn(dim, "border border-border")}>
        {person?.avatar_url && <AvatarImage src={person.avatar_url} alt="" />}
        <AvatarFallback className={cn(tint.avatar, "font-semibold")}>
          {initials(person)}
        </AvatarFallback>
      </Avatar>
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
 * A group or team conversation, as a tinted tile.
 *
 * Deliberately square-ish rather than a circle: at a glance in the list, shape
 * is what separates "a person" from "a room", and that reads faster than the
 * label does.
 */
export function GroupAvatar({
  title,
  accentName,
  size = "md",
  className,
}: {
  title: string;
  accentName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tint = accent(accentName ?? accentForName(title));
  const dim = {
    sm: "h-8 w-8 text-xs rounded-lg",
    md: "h-10 w-10 text-sm rounded-xl",
    lg: "h-14 w-14 text-base rounded-2xl",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border font-semibold",
        tint.avatar,
        dim,
        className,
      )}
      aria-hidden
    >
      {title.trim().slice(0, 2).toUpperCase() || "#"}
    </span>
  );
}
