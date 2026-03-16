import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const statusStyles: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  finalised: "bg-green-100 text-green-800",
};

export default async function ConsultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get practice IDs for the current user
  const { data: userPractices } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (userPractices ?? []).map((up) => up.practice_id);

  // Fetch consults joined with patients, clients (via patients.owner_id), and vets
  const { data: consults } = practiceIds.length > 0
    ? await supabase
        .from("consults")
        .select(`
          id,
          consult_date,
          status,
          template_used,
          patients (
            name,
            owner_id,
            clients:owner_id (
              name
            )
          ),
          users:vet_id (
            name
          )
        `)
        .in("practice_id", practiceIds)
        .order("consult_date", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [] };

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
        {(consults ?? []).map((consult) => {
          const patient = Array.isArray(consult.patients)
            ? consult.patients[0]
            : consult.patients;
          const client = patient
            ? Array.isArray(patient.clients)
              ? patient.clients[0]
              : patient.clients
            : null;
          const vet = Array.isArray(consult.users)
            ? consult.users[0]
            : consult.users;

          const patientName = patient?.name ?? "Unknown patient";
          const ownerName = client?.name ?? "Unknown owner";
          const vetName = vet?.name ?? "Unknown vet";
          const consultDate = consult.consult_date ?? "";
          const templateUsed = consult.template_used ?? "";
          const status = consult.status ?? "draft";

          return (
            <Card
              key={consult.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{patientName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({ownerName})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {templateUsed}{templateUsed && consultDate ? " · " : ""}{consultDate}
                    </p>
                    <p className="text-xs text-muted-foreground">{vetName}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusStyles[status] ?? ""}
                  >
                    {status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(consults ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No consults found.
          </p>
        )}
      </div>
    </div>
  );
}
