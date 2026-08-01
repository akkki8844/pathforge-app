import { cn } from "@/lib/utils";
import { PathforgeAvatar } from "./PathforgeAvatar";
import {
  AVATAR_FACES, AVATAR_PALETTES, AVATAR_PALETTE_KEYS,
  type AvatarId, type AvatarPalette,
} from "@/lib/avatars";

interface Props {
  value: AvatarId;
  onChange: (next: AvatarId) => void;
  disabled?: boolean;
}

/**
 * Two-row picker: character on top, colour underneath. Splitting them keeps the
 * grid at 8 + 6 tiles instead of the 48 a combined grid would need, and lets
 * someone recolour without losing the face they picked.
 */
export function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Character
        </p>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_FACES.map((face) => {
            const selected = value.face === face;
            return (
              <button
                key={face}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`Avatar character ${face}`}
                onClick={() => onChange({ ...value, face })}
                className={cn(
                  "rounded-2xl border-2 p-1.5 transition-all disabled:opacity-50",
                  selected
                    ? "border-primary bg-primary/5 scale-105"
                    : "border-border hover:border-foreground/25 hover:bg-muted/50",
                )}
              >
                <PathforgeAvatar
                  avatar={{ face, palette: value.palette }}
                  className="h-12 w-12"
                  selected={selected}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Colour
        </p>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_PALETTE_KEYS.map((palette) => {
            const selected = value.palette === palette;
            return (
              <button
                key={palette}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={AVATAR_PALETTES[palette as AvatarPalette].label}
                title={AVATAR_PALETTES[palette as AvatarPalette].label}
                onClick={() => onChange({ ...value, palette })}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-all disabled:opacity-50",
                  selected ? "scale-110 border-foreground" : "border-transparent hover:scale-105",
                )}
                style={{ background: AVATAR_PALETTES[palette as AvatarPalette].fill }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
