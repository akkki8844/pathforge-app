import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ALL_COUNTRIES, type CountryOption } from "@/lib/countries";

interface CountryComboboxProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Override the list of countries shown. Defaults to the full ISO list. */
  options?: CountryOption[];
}

/** Searchable single-country picker covering the full ISO list (or a curated subset). */
export function CountryCombobox({
  value,
  onChange,
  placeholder = "Select a country",
  className,
  disabled,
  options,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const list = options ?? ALL_COUNTRIES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={options ? "Search countries…" : "Search 195+ countries…"} />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {list.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c.name ? "opacity-100" : "opacity-0")} />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
