"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// TODO: Replace with real data from Supabase
const MOCK_PRACTICES = [
  { id: "1", name: "Vet Align", entity_name: "Vet Align Pty Ltd" },
  { id: "2", name: "Pet Align", entity_name: "Pet Align Pty Ltd" },
];

export function PracticeSwitcher() {
  const [selectedPractice, setSelectedPractice] = useState(MOCK_PRACTICES[0]);

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
        {MOCK_PRACTICES.map((practice) => (
          <DropdownMenuItem
            key={practice.id}
            onSelect={() => setSelectedPractice(practice)}
            className="flex items-center gap-2"
          >
            <Check
              className={cn(
                "h-4 w-4",
                selectedPractice.id === practice.id
                  ? "opacity-100"
                  : "opacity-0"
              )}
            />
            <div>
              <p className="text-sm font-medium">{practice.name}</p>
              <p className="text-xs text-muted-foreground">
                {practice.entity_name}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
