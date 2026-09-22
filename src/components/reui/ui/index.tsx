import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";

/**
 * Base UI primitives for the ReUI event calendar, and only for it.
 *
 * WHY THIS FILE EXISTS
 *
 * The calendar is authored against ReUI's own button/tooltip/popover/menu/
 * scroll-area, which are thin styled wrappers over Base UI and use its
 * `render` prop convention (`<TooltipTrigger render={<Button/>}>`) plus
 * `delay`/`closeDelay`/`timeout` on the tooltip provider. Pathforge's shadcn
 * components are Radix-based and have none of that, so wiring the calendar to
 * them fails to compile in a dozen places.
 *
 * ReUI's primitives are behind their paid registry (401), but Base UI itself
 * is open source and already a dependency of the calendar, so these are the
 * same components rebuilt from the same library.
 *
 * WHY THEY ARE HERE AND NOT IN components/ui
 *
 * Scoped to `components/reui` on purpose. Pathforge has its own Button,
 * Tooltip, Popover and DropdownMenu that the rest of the app uses; dropping
 * Base UI versions on top of those names would rewrite every page in the
 * product to land one calendar. Nothing outside the calendar imports this
 * file, so the blast radius is exactly the calendar.
 *
 * Styling follows the app's tokens so the calendar looks like Pathforge rather
 * than like a different product embedded in it.
 */

/* ── Button ─────────────────────────────────────────────────────────────── */

const BUTTON_VARIANTS = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "border border-border bg-background hover:bg-muted hover:text-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-muted hover:text-foreground",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 rounded-md px-3",
  default: "h-9 gap-2 rounded-md px-4",
  icon: "size-9 rounded-md",
  "icon-sm": "size-8 rounded-md",
} as const;

export interface ButtonProps
  extends Omit<useRender.ComponentProps<"button">, "defaultValue"> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  /** Upstream marks the current view/preset with this; drives data-active. */
  active?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  active,
  render,
  ...props
}: ButtonProps) {
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        // mergeProps types the literal against InputProps<"button">, which does
        // not model arbitrary data-* keys; they are valid DOM attributes and are
        // forwarded correctly at runtime.
        ...({ "data-slot": "button", "data-active": active ? "" : undefined } as Record<string, string | undefined>),
        className: cn(
          "inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium",
          "outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:shrink-0",
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          "data-[active]:bg-muted data-[active]:text-foreground",
          className,
        ),
      },
      props,
    ),
  });
}

/* ── Tooltip ────────────────────────────────────────────────────────────── */

export function TooltipProvider({
  delay = 600,
  closeDelay = 0,
  timeout = 300,
  children,
}: {
  delay?: number;
  closeDelay?: number;
  timeout?: number;
  children: React.ReactNode;
}) {
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay} timeout={timeout}>
      {children}
    </BaseTooltip.Provider>
  );
}

export function Tooltip({
  children,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Root>) {
  return <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>;
}

export const TooltipTrigger = BaseTooltip.Trigger;

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> & {
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          className={cn(
            "rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md",
            "origin-[var(--transform-origin)] transition-[transform,opacity] duration-100",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

/* ── Popover ────────────────────────────────────────────────────────────── */

export function Popover({
  children,
  ...props
}: React.ComponentProps<typeof BasePopover.Root>) {
  return <BasePopover.Root {...props}>{children}</BasePopover.Root>;
}

export const PopoverTrigger = BasePopover.Trigger;

export function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50"
      >
        <BasePopover.Popup
          className={cn(
            "rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/* ── Dropdown menu ──────────────────────────────────────────────────────── */

export function DropdownMenu({
  children,
  ...props
}: React.ComponentProps<typeof Menu.Root>) {
  return <Menu.Root {...props}>{children}</Menu.Root>;
}

export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export function DropdownMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof Menu.Popup> & {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50"
      >
        <Menu.Popup
          className={cn(
            "min-w-[9rem] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  active,
  children,
  ...props
}: React.ComponentProps<typeof Menu.Item> & { active?: boolean }) {
  return (
    <Menu.Item
      data-active={active ? "" : undefined}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
        "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        "data-[active]:bg-muted data-[active]:font-medium data-[active]:text-foreground",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </Menu.Item>
  );
}

export function DropdownMenuLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Menu.GroupLabel>) {
  return (
    <Menu.GroupLabel
      className={cn("px-2 py-1.5 text-[11px] font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Menu.GroupLabel>
  );
}

/* ── Scroll area ────────────────────────────────────────────────────────── */

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root className={cn("relative overflow-hidden", className)} {...props}>
      <BaseScrollArea.Viewport
        // The calendar measures and scrolls this element directly (scrollToTime,
        // the now-indicator autoscroll), so it carries the same data attribute
        // Radix uses — the view code queries for it by name.
        data-radix-scroll-area-viewport=""
        className="size-full overscroll-contain"
      >
        {children}
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none justify-center p-0.5 opacity-0 transition-opacity data-[hovering]:opacity-100 data-[scrolling]:opacity-100"
      >
        <BaseScrollArea.Thumb className="w-full rounded-full bg-foreground/25" />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Scrollbar
        orientation="horizontal"
        className="flex h-2 touch-none select-none p-0.5 opacity-0 transition-opacity data-[hovering]:opacity-100 data-[scrolling]:opacity-100"
      >
        <BaseScrollArea.Thumb className="h-full rounded-full bg-foreground/25" />
      </BaseScrollArea.Scrollbar>
    </BaseScrollArea.Root>
  );
}
