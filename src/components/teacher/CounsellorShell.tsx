import { ReactNode } from "react";
import { CounsellorNavbar } from "@/components/teacher/CounsellorNavbar";
import { CounsellorCommandPalette } from "@/components/teacher/CounsellorCommandPalette";

/**
 * The counsellor workspace shell.
 *
 * One bar and the page. Nothing else.
 *
 * What used to be here: a collapsible icon sidebar, a second title bar
 * repeating the page name the sidebar had already highlighted, an aurora
 * backdrop, a radial accent wash over the top 480px, and a glow filter behind
 * every active icon. Five decorative layers stacked behind a screen whose job
 * is to be read every morning — and between the rail and the title bar, about a
 * fifth of the window was chrome describing the other four fifths.
 *
 * The student side never had any of it, which is the whole argument: the two
 * workspaces are one product and should be the same amount of quiet.
 */
export function CounsellorShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col bg-background">
      <CounsellorNavbar />
      {/* Mounted here rather than per page, so Cmd+K reaches the roster from
          every counsellor surface — including any added later. */}
      <CounsellorCommandPalette />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
