import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlowButton({
  text = "Modern Button",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { text?: string }) {
  return (
    <button
      className={cn(
        "group relative flex items-center gap-1 overflow-hidden rounded-[100px] border-[1.5px] border-border bg-transparent px-8 py-3 text-sm font-semibold text-foreground cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:text-accent-foreground hover:rounded-xl active:scale-[0.95]",
        className,
      )}
      {...props}
    >
      <ArrowRight className="absolute w-4 h-4 left-[-25%] stroke-foreground fill-none z-[9] group-hover:left-4 group-hover:stroke-accent-foreground transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
      <span className="relative z-[1] -translate-x-3 group-hover:translate-x-3 transition-all duration-[800ms] ease-out">
        {text}
      </span>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full opacity-0 group-hover:w-[220px] group-hover:h-[220px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)]" />
      <ArrowRight className="absolute w-4 h-4 right-4 stroke-foreground fill-none z-[9] group-hover:right-[-25%] group-hover:stroke-accent-foreground transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
    </button>
  );
}
