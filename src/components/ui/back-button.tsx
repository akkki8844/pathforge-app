import { Link, type LinkProps } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to?: LinkProps["to"];
  label?: string;
  className?: string;
}

export function BackButton({ to = "/", label = "Back", className }: BackButtonProps) {
  return (
    <Button variant="ghost" size="sm" asChild className={cn("group overflow-hidden", className)}>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4 -translate-x-5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
        <span className="transition-transform duration-300 group-hover:translate-x-1">{label}</span>
      </Link>
    </Button>
  );
}
