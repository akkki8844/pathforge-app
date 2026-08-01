import { AlertTriangle, Loader2 } from "lucide-react";

interface AiGenerationNoticeProps {
  active?: boolean;
  className?: string;
}

export function AiGenerationNotice({ active = false, className = "" }: AiGenerationNoticeProps) {
  return (
    <div className={`rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground ${className}`}>
      <div className="flex items-start gap-2.5">
        {active ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        )}
        <p className="leading-relaxed">
          <strong>Keep this tab open and active during AI generation.</strong> Do not close the page or switch tabs; the process may halt. If generation fails, the credit is refunded automatically.
        </p>
      </div>
    </div>
  );
}