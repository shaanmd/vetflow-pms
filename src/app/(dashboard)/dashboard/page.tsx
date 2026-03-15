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

// TODO: Replace with real data
const stats = [
  { label: "Today's Appointments", value: "4", icon: CalendarDays, change: "+2 from yesterday" },
  { label: "Active Patients", value: "127", icon: PawPrint, change: "+3 this week" },
  { label: "Pending Consults", value: "2", icon: FileText, change: "drafts" },
  { label: "Outstanding Invoices", value: "$1,850", icon: Receipt, change: "3 invoices" },
];

const todayAppointments = [
  {
    id: "1",
    time: "9:00 AM",
    patient: "Max",
    owner: "Sarah Johnson",
    type: "Rehab Follow-up",
    status: "confirmed",
    location: "House call — 42 Elm St",
  },
  {
    id: "2",
    time: "10:30 AM",
    patient: "Bella",
    owner: "Tom Richards",
    type: "Equine Dental",
    status: "scheduled",
    location: "House call — Sunshine Stables",
  },
  {
    id: "3",
    time: "1:00 PM",
    patient: "Cooper",
    owner: "Jane Smith",
    type: "Rehab Initial Assessment",
    status: "confirmed",
    location: "Clinic",
  },
  {
    id: "4",
    time: "3:00 PM",
    patient: "Thunder",
    owner: "Mike O'Brien",
    type: "Equine Biomechanical",
    status: "scheduled",
    location: "House call — Willowdale Farm",
  },
];

const statusColours: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back. Here&apos;s your day.
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
          {todayAppointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium text-muted-foreground min-w-[70px]">
                {apt.time}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{apt.patient}</span>
                  <span className="text-xs text-muted-foreground">
                    ({apt.owner})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {apt.type}
                </p>
                <p className="text-xs text-muted-foreground">{apt.location}</p>
              </div>
              <Badge
                variant="secondary"
                className={statusColours[apt.status] || ""}
              >
                {apt.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
