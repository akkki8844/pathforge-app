import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SchoolRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  domain: string | null;
}

interface Props {
  value: SchoolRow | null;
  onChange: (school: SchoolRow | null) => void;
  /** Optional pre-fill text used to seed a search */
  initialQuery?: string;
}

export function SchoolPicker({ value, onChange, initialQuery = "" }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState(value?.name || initialQuery);
  const [results, setResults] = useState<SchoolRow[]>([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2 || (value && value.name === query)) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from("schools")
        .select("id,name,city,country,domain")
        .ilike("name", `%${query.trim()}%`)
        .order("is_verified", { ascending: false })
        .limit(8);
      setResults((data ?? []) as SchoolRow[]);
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  const pick = (s: SchoolRow) => {
    onChange(s);
    setQuery(s.name);
    setOpen(false);
  };

  const createSchool = async () => {
    if (newName.trim().length < 2) {
      toast({ variant: "destructive", title: "Name too short" });
      return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      toast({ variant: "destructive", title: "Please sign in first" });
      return;
    }
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name: newName.trim(),
        city: newCity.trim() || null,
        country: newCountry.trim() || null,
        is_verified: false,
        created_by: user.id,
      })
      .select("id,name,city,country,domain")
      .single();
    setCreating(false);
    if (error || !data) {
      toast({ variant: "destructive", title: "Could not add school", description: error?.message });
      return;
    }
    toast({ title: "School added", description: "Pending admin verification." });
    pick(data as SchoolRow);
    setShowCreate(false);
    setNewName(""); setNewCity(""); setNewCountry("");
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search your school…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(null); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-10"
          maxLength={120}
        />
        {value && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
        )}
        {open && query.trim().length >= 2 && !value && (
          <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
            {results.length > 0 ? results.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border/50 last:border-b-0"
              >
                <div className="font-medium text-foreground">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.city, s.country].filter(Boolean).join(", ") || "Unverified"}
                </div>
              </button>
            )) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">No matches.</div>
            )}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowCreate(true); setNewName(query); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 border-t border-border flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add "{query}" as a new school
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-medium text-foreground">Add new school</p>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="School name" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" />
            <Input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Country" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={createSchool} disabled={creating}>{creating ? "Adding…" : "Add school"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
