import React from "react";
import { cn } from "@/lib/utils";

interface ProjectBannerProps {
  variant?: "success" | "warning" | "error";
  label: React.ReactNode;
  icon?: React.ReactNode;
  callToAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Full-width strip banner, meant to sit directly under the navbar
 * (`AnnouncementBanner` / `EmailVerificationBanner` occupy the same slot).
 * Uses the app's own semantic tokens rather than a hardcoded palette so it
 * matches both themes for free.
 */
export const ProjectBanner = ({
  variant = "success",
  label,
  icon,
  callToAction,
}: ProjectBannerProps) => {
  return (
    <aside
      className={cn(
        "sticky top-16 z-40 flex min-h-10 items-center justify-center gap-x-2 border-y py-2 text-sm backdrop-blur",
        variant === "success" && "border-primary/30 bg-primary/10 text-foreground",
        variant === "warning" && "border-accent/30 bg-accent/10 text-foreground",
        variant === "error" && "border-destructive/30 bg-destructive/10 text-foreground",
      )}
    >
      <div className="section-container flex w-full flex-col gap-2 px-6 md:flex-row md:items-center md:justify-center">
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className={cn(
                "h-4 w-4 shrink-0",
                variant === "success" && "text-primary",
                variant === "warning" && "text-accent",
                variant === "error" && "text-destructive",
              )}
            >
              {icon}
            </div>
          )}
          <p>{label}</p>
        </div>
        {callToAction && (
          <div className="ml-6 md:ml-0">
            {callToAction.href ? (
              <a
                href={callToAction.href}
                className={cn(
                  "font-medium underline underline-offset-[5px] duration-100",
                  variant === "success" && "text-primary hover:text-primary/80",
                  variant === "warning" && "text-accent hover:text-accent/80",
                  variant === "error" && "text-destructive hover:text-destructive/80",
                )}
              >
                {callToAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={callToAction.onClick}
                className={cn(
                  "cursor-pointer font-medium underline underline-offset-[5px] duration-100",
                  variant === "success" && "text-primary hover:text-primary/80",
                  variant === "warning" && "text-accent hover:text-accent/80",
                  variant === "error" && "text-destructive hover:text-destructive/80",
                )}
              >
                {callToAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
