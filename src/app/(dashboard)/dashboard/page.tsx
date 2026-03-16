import { redirect } from "next/navigation";
import {
  CalendarDays,
  PawPrint,
  FileText,
  Receipt,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

const statusColours: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
};

function formatTime(time: string): string {
  // time is "HH:MM:SS" from Postgres
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch user profile for name
  const { data: userProfile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  // Fetch practice IDs for this user
  const { data: userPractices } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (userPractices ?? []).map((row) => row.practice_id);

  // All stat and appointment queries require at least one practice
  let todayAppointments: {
    id: string;
    start_time: string;
    status: string;
    location_type: string;
    location_address: string | null;
    appointment_type_id: string;
    patients: { name: string } | null;
    clients: { name: string } | null;
  }[] = [];

  let appointmentCount = 0;
  let activePatientCount = 0;
  let draftConsultCount = 0;
  let outstandingInvoiceSum = 0;

  if (practiceIds.length > 0) {
    // Today's appointments with patient and client names
    const { data: apptData } = await supabase
      .from("appointments")
      .select(`
        id,
        start_time,
        status,
        location_type,
        location_address,
        appointment_type_id,
        patients ( name ),
        clients ( name )
      `)
      .in("practice_id", practiceIds)
      .eq("date", today)
      .not("status", "in", "(cancelled,no_show)")
      .order("start_time");

    todayAppointments = (apptData ?? []) as unknown as typeof todayAppointments;
    appointmentCount = todayAppointments.length;

    // Count active patients
    const { count: patientCount } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .in("practice_id", practiceIds)
      .eq("status", "active");

    activePatientCount = patientCount ?? 0;

    // Count draft consults
    const { count: consultCount } = await supabase
      .from("consults")
      .select("id", { count: "exact", head: true })
      .in("practice_id", practiceIds)
      .eq("status", "draft");

    draftConsultCount = consultCount ?? 0;

    // Sum outstanding invoices (sent, overdue, partially_paid)
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("total")
      .in("practice_id", practiceIds)
      .in("status", ["sent", "overdue", "partially_paid"]);

    outstandingInvoiceSum = (invoiceData ?? []).reduce(
      (sum, inv) => sum + (inv.total ?? 0),
      0
    );
  }

  const firstName = userProfile?.name?.split(" ")[0] ?? "there";

  const stats = [
    {
      label: "Today's Appointments",
      value: String(appointmentCount),
      icon: CalendarDays,
      change: appointmentCount === 1 ? "1 appointment" : `${appointmentCount} appointments`,
    },
    {
      label: "Active Patients",
      value: String(activePatientCount),
      icon: PawPrint,
      change: "across your practices",
    },
    {
      label: "Pending Consults",
      value: String(draftConsultCount),
      icon: FileText,
      change: "drafts",
    },
    {
      label: "Outstanding Invoices",
      value: `$${outstandingInvoiceSum.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: Receipt,
      change: "sent, overdue, partial",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {firstName}. Here&apos;s your day.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <TrendingUp className="h-3 w-3 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Today&apos;s Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No appointments scheduled for today.
            </p>
          ) : (
            todayAppointments.map((apt) => {
              const location =
                apt.location_type === "house_call" && apt.location_address
                  ? `House call — ${apt.location_address}`
                  : apt.location_type === "house_call"
                  ? "House call"
                  : "Clinic";

              return (
                <div
                  key={apt.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-medium text-muted-foreground min-w-[70px]">
                    {formatTime(apt.start_time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {(Array.isArray(apt.patients) ? apt.patients[0]?.name : apt.patients?.name) ?? "Unknown patient"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({(Array.isArray(apt.clients) ? apt.clients[0]?.name : apt.clients?.name) ?? "Unknown client"})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.appointment_type_id}
                    </p>
                    <p className="text-xs text-muted-foreground">{location}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusColours[apt.status] || ""}
                  >
                    {apt.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
