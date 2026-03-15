import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// TODO: Replace with real data from Supabase
const mockPatients = [
  { id: "1", name: "Max", species: "dog", breed: "German Shepherd", owner: "Sarah Johnson", status: "active", lastVisit: "2026-03-10" },
  { id: "2", name: "Bella", species: "horse", breed: "Thoroughbred", owner: "Tom Richards", status: "active", lastVisit: "2026-03-12" },
  { id: "3", name: "Cooper", species: "dog", breed: "Golden Retriever", owner: "Jane Smith", status: "active", lastVisit: "2026-03-08" },
  { id: "4", name: "Thunder", species: "horse", breed: "Quarter Horse", owner: "Mike O'Brien", status: "active", lastVisit: "2026-03-14" },
  { id: "5", name: "Milo", species: "cat", breed: "Domestic Shorthair", owner: "Lisa Chen", status: "active", lastVisit: "2026-02-28" },
];

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  horse: "🐴",
  other: "🐾",
};

export default function PatientsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          New Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients, owners, microchip..."
          className="pl-9 min-h-[44px]"
        />
      </div>

      {/* Patient List */}
      <div className="space-y-2">
        {mockPatients.map((patient) => (
          <Card key={patient.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-lg">
                  {speciesEmoji[patient.species]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{patient.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {patient.species}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {patient.breed} · {patient.owner}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last visit: {patient.lastVisit}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
