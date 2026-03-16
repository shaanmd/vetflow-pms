import { redirect } from "next/navigation";
import {
  CalendarDays,
  PawPrint,
  Receipt,
  Clock,
  TrendingUp,
  Plus,
  NotebookPen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// ─── Status badge colours ────────────────────────────────────────────────────

const statusColours: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
};

// ─── Appointment type helpers ─────────────────────────────────────────────────

const APPT_TYPE_LABELS: Record<string, string> = {
  consult: "General Consult",
  "equine-dental": "Equine Dental",
  "equine-biomech": "Equine Biomechanical",
  "rehab-initial": "Rehab Initial Assessment",
  "rehab-followup": "Rehab Follow-up",
  palliative: "Palliative Consult",
  vaccination: "Vaccination",
  hydro: "Hydrotherapy",
};

function getApptTypeLabel(typeId: string): string {
  if (APPT_TYPE_LABELS[typeId]) return APPT_TYPE_LABELS[typeId];
  // Fallback: replace hyphens/underscores with spaces and title-case each word
  return typeId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns a Tailwind bg-* class for the coloured dot */
function getApptTypeDotColour(typeId: string): string {
  if (typeId.startsWith("equine")) return "bg-green-500";
  if (typeId.startsWith("rehab")) return "bg-purple-500";
  if (typeId === "palliative") return "bg-violet-500";
  if (typeId === "vaccination") return "bg-cyan-500";
  if (typeId === "hydro") return "bg-teal-500";
  // consult / fallback
  return "bg-blue-500";
}

// ─── Stat card accent colours ─────────────────────────────────────────────────

/** border-l colour class for each stat card */
const STAT_BORDER_COLOURS = [
  "border-l-teal-500",   // Today's Appointments
  "border-l-blue-500",   // Active Patients
  "border-l-yellow-500", // Pending Consults
  "border-l-red-500",    // Outstanding Invoices
] as const;

/** Icon colour class for each stat card */
const STAT_ICON_COLOURS = [
  "text-teal-500",
  "text-blue-500",
  "text-yellow-500",
  "text-red-500",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "New Appointment", icon: CalendarDays, href: "/appointments/new" },
  { label: "Add Notes", icon: NotebookPen, href: "/calendar" },
  { label: "New Patient", icon: PawPrint, href: "/patients/new" },
  { label: "New Invoice", icon: Receipt, href: "/invoices/new" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

    const { count: patientCount } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .in("practice_id", practiceIds)
      .eq("status", "active");

    activePatientCount = patientCount ?? 0;

    const { count: consultCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .in("practice_id", practiceIds)
      .eq("clinical_status", "draft");

    draftConsultCount = consultCount ?? 0;

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
      change:
        appointmentCount === 1 ? "1 appointment" : `${appointmentCount} appointments`,
    },
    {
      label: "Active Patients",
      value: String(activePatientCount),
      icon: PawPrint,
      change: "across your practices",
    },
    {
      label: "Draft Notes",
      value: String(draftConsultCount),
      icon: NotebookPen,
      change: "drafts",
    },
    {
      label: "Outstanding Invoices",
      value: `$${outstandingInvoiceSum.toLocaleString("en-AU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      icon: Receipt,
      change: "sent, overdue, partial",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {firstName}. Here&apos;s your day.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <Card
            key={stat.label}
            className={`border-l-4 ${STAT_BORDER_COLOURS[i]}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-4 w-4 ${STAT_ICON_COLOURS[i]}`} />
                <TrendingUp className="h-3 w-3 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_ACTIONS.map((action) => (
          <a key={action.label} href={action.href} className="shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
              <Plus className="h-3.5 w-3.5" />
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          </a>
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

              const typeLabel = getApptTypeLabel(apt.appointment_type_id);
              const dotColour = getApptTypeDotColour(apt.appointment_type_id);

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
                        {(Array.isArray(apt.patients)
                          ? apt.patients[0]?.name
                          : apt.patients?.name) ?? "Unknown patient"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(Array.isArray(apt.clients)
                          ? apt.clients[0]?.name
                          : apt.clients?.name) ?? "Unknown client"}
                        )
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotColour}`}
                        aria-hidden="true"
                      />
                      {typeLabel}
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
