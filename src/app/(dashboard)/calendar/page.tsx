"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppointments, type AppointmentRow } from "./actions";
import { ConsultSheet } from "./consult-sheet";

// ── Helpers ────────────────────────────────────────────────────────────────

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Format a JS Date as YYYY-MM-DD (local, not UTC) */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Format a time string like "09:00:00" → "9:00 AM" */
function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

// ── Appointment-type colour map ────────────────────────────────────────────
// Keys match the appointment_type_id values used in the seed / product setup.
// Add more entries here as new appointment types are created.
const TYPE_COLOURS: Record<string, string> = {
  rehab_initial:    "bg-purple-100 border-purple-300 text-purple-800",
  rehab_followup:   "bg-blue-100   border-blue-300   text-blue-800",
  equine_dental:    "bg-green-100  border-green-300  text-green-800",
  equine_biomech:   "bg-amber-100  border-amber-300  text-amber-800",
  house_call:       "bg-teal-100   border-teal-300   text-teal-800",
  wellness:         "bg-lime-100   border-lime-300   text-lime-800",
  vaccination:      "bg-cyan-100   border-cyan-300   text-cyan-800",
  surgery:          "bg-rose-100   border-rose-300   text-rose-800",
};

const TRAVEL_COLOUR = "bg-gray-100 border-gray-300 text-gray-500";
const FALLBACK_COLOUR = "bg-slate-100 border-slate-300 text-slate-700";

function appointmentColour(typeId: string): string {
  return TYPE_COLOURS[typeId] ?? FALLBACK_COLOUR;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);

  // Fetch appointments whenever the date changes (day view only)
  useEffect(() => {
    if (view !== "day") return;
    let cancelled = false;

    setLoading(true);
    getAppointments(toDateString(currentDate)).then((data) => {
      if (!cancelled) {
        setAppointments(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentDate, view]);

  // Re-fetch appointments for the current date
  function refreshAppointments() {
    setLoading(true);
    getAppointments(toDateString(currentDate)).then((data) => {
      setAppointments(data);
      setLoading(false);
    });
  }

  // ── Date navigation ──────────────────────────────────────────────────────
  function prevDay() {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }

  function nextDay() {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  const formattedDate = currentDate.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Render helpers ───────────────────────────────────────────────────────

  /** Render an appointment card (real appointment or travel buffer) */
  function renderAppointmentCard(apt: AppointmentRow) {
    const isTravel = apt.appointment_type_id === "travel";
    const colour = isTravel ? TRAVEL_COLOUR : appointmentColour(apt.appointment_type_id);
    const startLabel = formatTime(apt.start_time);
    const endLabel = formatTime(apt.end_time);

    const clinicalDot =
      apt.clinical_status === "finalised" ? (
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" title="Finalised" />
      ) : apt.clinical_status === "draft" ? (
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Draft" />
      ) : null;

    return (
      <Card
        key={apt.id}
        className={`border-l-4 ${colour} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => !isTravel && setSelectedAppointment(apt)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {startLabel} – {endLabel}
              </p>
              {isTravel ? (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Travel buffer
                </p>
              ) : (
                <>
                  {apt.patient && (
                    <p className="text-sm font-semibold mt-1">{apt.patient.name}</p>
                  )}
                  {apt.client && (
                    <p className="text-xs text-muted-foreground">
                      {apt.client.name}
                    </p>
                  )}
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {apt.appointment_type_id.replace(/_/g, " ")}
                  </Badge>
                  {apt.location_type === "house_call" && apt.location_address && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[240px]">
                      {apt.location_address}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {!isTravel && clinicalDot}
              {!isTravel && apt.status !== "scheduled" && (
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize"
                >
                  {apt.status}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /** Render travel time buffer blocks that follow a house-call appointment */
  function renderWithTravelBuffers(apts: AppointmentRow[]) {
    const blocks: React.ReactNode[] = [];

    apts.forEach((apt) => {
      blocks.push(renderAppointmentCard(apt));

      if (
        apt.location_type === "house_call" &&
        apt.travel_time_minutes &&
        apt.travel_time_minutes > 0
      ) {
        // Calculate buffer start = appointment end_time
        const [eh, em] = apt.end_time.split(":").map(Number);
        const bufferStart = new Date(0, 0, 0, eh, em);
        const bufferEnd = new Date(
          bufferStart.getTime() + apt.travel_time_minutes * 60_000
        );

        const fmt = (d: Date) => {
          const h = d.getHours();
          const min = String(d.getMinutes()).padStart(2, "0");
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 === 0 ? 12 : h % 12;
          return `${h12}:${min} ${ampm}`;
        };

        blocks.push(
          <Card
            key={`travel-${apt.id}`}
            className={`border-l-4 ${TRAVEL_COLOUR}`}
          >
            <CardContent className="p-3">
              <p className="text-sm font-medium">
                {fmt(bufferStart)} – {fmt(bufferEnd)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                Travel buffer ({apt.travel_time_minutes} min)
              </p>
            </CardContent>
          </Card>
        );
      }
    });

    return blocks;
  }

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          New Appointment
        </Button>
      </div>

      {/* View Toggle + Date Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="min-w-[44px] min-h-[44px]"
            onClick={prevDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {formattedDate}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="min-w-[44px] min-h-[44px]"
            onClick={nextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="day" className="min-h-[36px] px-4">Day</TabsTrigger>
            <TabsTrigger value="week" className="min-h-[36px] px-4">Week</TabsTrigger>
            <TabsTrigger value="month" className="min-h-[36px] px-4">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Day View — Mobile-first agenda style */}
      {view === "day" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading appointments…</span>
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No appointments scheduled for this day.</p>
              </CardContent>
            </Card>
          ) : (
            renderWithTravelBuffers(appointments)
          )}
        </div>
      )}

      {/* Week View Placeholder */}
      {view === "week" && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map((d) => (
                <div key={d} className="text-xs font-medium text-center p-2">
                  {d}
                </div>
              ))}
            </div>
            <p className="text-sm">Week view — coming soon</p>
          </CardContent>
        </Card>
      )}

      {/* Month View Placeholder */}
      {view === "month" && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Month view — coming soon</p>
          </CardContent>
        </Card>
      )}

      <ConsultSheet
        appointment={selectedAppointment}
        open={selectedAppointment !== null}
        onClose={() => setSelectedAppointment(null)}
        onSaved={refreshAppointments}
      />
    </div>
  );
}
