import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, GraduationCap, Plus, X } from "lucide-react";
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
import { collegeMatchesQuery } from "@/lib/colleges";
import { universityNamesFor, useWorldUniversities } from "@/lib/worldUniversities";
import { CollegeLogo } from "@/components/CollegeLogo";

interface MultiUniversityComboboxProps {
  values: string[];
  onChange: (next: string[]) => void;
  /** Restrict suggestions to these countries; empty = all countries. */
  countries?: string[];
  max?: number;
  placeholder?: string;
  className?: string;
  /** Allow free-text additions when the user types a university we don't know. */
  allowCustom?: boolean;
}

/**
 * Searchable, multi-select university picker that scales to thousands of options.
 * Replaces the old "long chip list" UX. Always shows the current selection as
 * removable chips above the search popover.
 */
export function MultiUniversityCombobox({
  values,
  onChange,
  countries,
  max = 5,
  placeholder = "Search universities…",
  className,
  allowCustom = true,
}: MultiUniversityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The world list (~10,000 institutions) loads the first time the popover
  // opens; until then the curated schools are already searchable.
  const world = useWorldUniversities(open);
  const pool = useMemo(() => universityNamesFor(countries ?? [], world), [countries, world]);
  const filtered = useMemo(() => {
    const q = query.trim();
    const base = q ? pool.filter((u) => collegeMatchesQuery(u, q)) : pool;
    return base.slice(0, 100);
  }, [pool, query]);

  const atLimit = values.length >= max;

  const toggle = (name: string) => {
    if (values.includes(name)) {
      onChange(values.filter((v) => v !== name));
      return;
    }
    if (atLimit) return;
    onChange([...values, name]);
  };

  const addCustom = () => {
    const v = query.trim();
    if (!v || values.includes(v) || atLimit) return;
    onChange([...values, v]);
    setQuery("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1.5">
              <CollegeLogo name={v} size={14} className="rounded-[3px]" />
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
            disabled={atLimit}
            className={cn("w-full justify-between font-normal", atLimit && "opacity-60")}
          >
            <span className="flex items-center gap-2 truncate text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              {atLimit
                ? `Limit reached (${max})`
                : `${placeholder} (${values.length}/${max})`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {allowCustom && query.trim().length >= 2 ? (
                  <button
                    type="button"
                    onClick={addCustom}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add "{query.trim()}"
                  </button>
                ) : (
                  "No university found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((name) => {
                  const selected = values.includes(name);
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => toggle(name)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <CollegeLogo name={name} size={16} className="mr-2" />
                      {name}
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
