import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// TODO: Replace with real data
const mockConsults = [
  { id: "1", date: "2026-03-14", patient: "Thunder", owner: "Mike O'Brien", type: "Equine Biomechanical", status: "draft", vet: "Shaan" },
  { id: "2", date: "2026-03-14", patient: "Max", owner: "Sarah Johnson", type: "Rehab Follow-up", status: "finalised", vet: "Shaan" },
  { id: "3", date: "2026-03-13", patient: "Cooper", owner: "Jane Smith", type: "Rehab Initial Assessment", status: "finalised", vet: "Shaan" },
  { id: "4", date: "2026-03-12", patient: "Bella", owner: "Tom Richards", type: "Equine Dental", status: "finalised", vet: "Shaan" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  finalised: "bg-green-100 text-green-800",
};

export default function ConsultsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Consults</h1>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          New Consult
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search consults..."
          className="pl-9 min-h-[44px]"
        />
      </div>

      <div className="space-y-2">
        {mockConsults.map((consult) => (
          <Card key={consult.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{consult.patient}</span>
                    <span className="text-xs text-muted-foreground">
                      ({consult.owner})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {consult.type} · {consult.date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dr {consult.vet}
                  </p>
                </div>
                <Badge variant="secondary" className={statusStyles[consult.status]}>
                  {consult.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
