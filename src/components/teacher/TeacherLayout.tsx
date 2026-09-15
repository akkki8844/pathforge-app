import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { CounsellorShell } from "@/components/teacher/CounsellorShell";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The frame every counsellor page sits in: the bar, one measured column, and
 * the verification notice when it applies.
 *
 * `bare` drops the column so a page can own its own full-bleed layout — the
 * counsellor home does, because its grid field runs edge to edge the way the
 * student home's does.
 */
export function TeacherLayout({
  children,
  bare = false,
}: {
  children: ReactNode;
  bare?: boolean;
}) {
  const { teacherProfile } = useAuth();
  const verified = !!teacherProfile?.verified;

  const notice = !verified && (
    <div className="mb-6 flex gap-3 rounded-xl border border-border bg-card p-4">
      <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">Awaiting verification</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Student data unlocks once your school link is verified. You can still create
          cohorts and draft action plans.{" "}
          <Link to="/teacher/settings" className="underline hover:text-foreground">
            Check your school link
          </Link>
          .
        </p>
      </div>
    </div>
  );

  if (bare) {
    return (
      <CounsellorShell>
        {/* Matched to the counsellor home's own column, not the workspace
            container, so the notice lines up with the cards under it. */}
        {notice && (
          <div className="mx-auto w-full max-w-[1200px] px-5 pt-8 sm:px-8">{notice}</div>
        )}
        {children}
      </CounsellorShell>
    );
  }

  return (
    <CounsellorShell>
      <div className="mx-auto w-full max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">
        {notice}
        {children}
      </div>
    </CounsellorShell>
  );
}
