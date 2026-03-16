import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  horse: "🐴",
  other: "🐾",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No visits";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get the practice IDs for this user
  const { data: userPractices } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (userPractices ?? []).map((up) => up.practice_id);

  // Fetch patients with owner name, ordered by updated_at desc
  // Also fetch the most recent appointment date (where clinical notes exist) per patient
  const { data: patients } = practiceIds.length
    ? await supabase
        .from("patients")
        .select(
          `
          id,
          name,
          species,
          breed,
          status,
          updated_at,
          owner:clients!owner_id (
            name
          ),
          appointments (
            date,
            clinical_status
          )
        `
        )
        .in("practice_id", practiceIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  // Resolve the most recent appointment date with clinical notes for each patient
  const patientList = (patients ?? []).map((p) => {
    const appts = (p.appointments ?? []) as { date: string; clinical_status: string }[];
    const withNotes = appts.filter((a) => a.clinical_status !== "none");
    const lastVisit =
      withNotes.length > 0
        ? withNotes.reduce((latest, a) =>
            a.date > latest.date ? a : latest
          ).date
        : null;

    const ownerRaw = p.owner;
    const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;

    return {
      id: p.id as string,
      name: p.name as string,
      species: p.species as string,
      breed: (p.breed ?? "") as string,
      ownerName: owner?.name ?? "Unknown Owner",
      status: p.status as string,
      lastVisit,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          New Patient
        </Button>
      </div>

      {/* Search — will be wired up client-side */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients, owners, microchip..."
          className="pl-9 min-h-[44px]"
        />
      </div>

      {/* Patient List */}
      {patientList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No patients found. Add your first patient to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {patientList.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-lg">
                      {speciesEmoji[patient.species] ?? speciesEmoji.other}
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
                      {patient.breed ? `${patient.breed} · ` : ""}
                      {patient.ownerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last visit: {formatDate(patient.lastVisit)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
