import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALL_COUNTRIES } from "@/lib/countries";

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable multi-select for the full ISO country list. Replaces dropdown-based
 * destination selectors that don't scale past ~10 options.
 */
export function MultiCountryCombobox({
  values,
  onChange,
  max,
  placeholder = "Search countries…",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
      : ALL_COUNTRIES;
    return base.slice(0, 100);
  }, [query]);

  const atLimit = max != null && values.length >= max;

  const toggle = (name: string) => {
    if (values.includes(name)) {
      onChange(values.filter((v) => v !== name));
      return;
    }
    if (atLimit) return;
    onChange([...values, name]);
  };

  const label = max
    ? `${placeholder} (${values.length}/${max})`
    : `${placeholder} (${values.length})`;

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-destructive"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!!atLimit}
            className={cn("w-full justify-between font-normal", atLimit && "opacity-60")}
          >
            <span className="flex items-center gap-2 truncate text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {atLimit ? `Limit reached (${max})` : label}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search 195+ countries…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((c) => {
                  const selected = values.includes(c.name);
                  return (
                    <CommandItem
                      key={c.code}
                      value={c.name}
                      onSelect={() => toggle(c.name)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
