"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "vetflow_practice_id";

type Practice = {
  id: string;
  name: string;
};

export function PracticeSwitcher() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPractices() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_practices")
        .select("practice_id, practices(id, name)")
        .eq("user_id", user.id);

      if (error || !data) {
        setLoading(false);
        return;
      }

      const fetched: Practice[] = data
        .map((row) => {
          const p = Array.isArray(row.practices) ? row.practices[0] : row.practices;
          return p ? { id: p.id, name: p.name } : null;
        })
        .filter((p): p is Practice => p !== null);

      setPractices(fetched);

      const storedId = localStorage.getItem(STORAGE_KEY);
      const restored = fetched.find((p) => p.id === storedId) ?? fetched[0] ?? null;
      setSelectedPractice(restored);

      setLoading(false);
    }

    fetchPractices();
  }, []);

  function handleSelect(practice: Practice) {
    setSelectedPractice(practice);
    localStorage.setItem(STORAGE_KEY, practice.id);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 w-full">
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!selectedPractice) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 w-full">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No practice</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer w-full">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm truncate max-w-[140px]">
          {selectedPractice.name}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {practices.map((practice) => (
          <DropdownMenuItem
            key={practice.id}
            onSelect={() => handleSelect(practice)}
            className="flex items-center gap-2"
          >
            <Check
              className={cn(
                "h-4 w-4",
                selectedPractice.id === practice.id ? "opacity-100" : "opacity-0"
              )}
            />
            <p className="text-sm font-medium">{practice.name}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
