import { ReactNode } from "react";
import { CounsellorShell } from "@/components/teacher/CounsellorShell";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

export function TeacherLayout({ children }: { children: ReactNode }) {
  const { teacherProfile } = useAuth();
  const verified = !!teacherProfile?.verified;

  return (
    <CounsellorShell>
      <div className="mx-auto w-full max-w-[1760px] px-5 lg:px-8 xl:px-12 py-6 lg:py-8">
        {!verified && (
          <div className="mb-6 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-4 flex gap-3 shadow-[0_4px_24px_-12px_hsl(var(--accent)/0.25)]">
            <ShieldAlert className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Awaiting verification</p>
              <p className="text-xs text-muted-foreground mt-1">
                Student data unlocks once your school link is verified. You can still create cohorts and draft action plans.
              </p>
            </div>
          </div>
        )}
        {children}
      </div>
    </CounsellorShell>
  );
}
