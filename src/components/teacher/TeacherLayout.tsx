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
  /*
   * Two different states wore the same banner.
   *
   * A counsellor who has never linked a school and one whose link is sitting
   * in the review queue were both told "awaiting verification" and sent to
   * /teacher/settings — where the school field is disabled and reads
   * "Linked by admin". The first of those two has something to do and was
   * given nowhere to do it: the page that takes the link and the proof is
   * /teacher/onboarding, which until now had no route at all.
   */
  const linked = !!teacherProfile?.school_id;

  const notice = !verified && (
    <div className="mb-6 flex gap-3 rounded-xl border border-border bg-card p-4">
      <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {linked ? "Awaiting verification" : "Link your school to see students"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {linked ? (
            <>
              Your school link is with us for review. Student data unlocks once it is
              approved, and you can still create cohorts and draft action plans in the
              meantime.{" "}
              <Link to="/teacher/onboarding" className="underline hover:text-foreground">
                Add more proof
              </Link>
              .
            </>
          ) : (
            <>
              Nobody is linked to you yet because your account is not attached to a
              school. It takes a minute and many schools verify instantly.{" "}
              <Link to="/teacher/onboarding" className="underline hover:text-foreground">
                Link your school
              </Link>
              .
            </>
          )}
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
