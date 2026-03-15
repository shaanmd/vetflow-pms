"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const today = new Date();
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// TODO: Replace with real data
const mockAppointments = [
  { id: "1", time: "9:00", endTime: "10:00", patient: "Max", type: "Rehab Follow-up", colour: "bg-blue-100 border-blue-300 text-blue-800" },
  { id: "2", time: "10:30", endTime: "11:30", patient: "Bella", type: "Equine Dental", colour: "bg-green-100 border-green-300 text-green-800" },
  { id: "t1", time: "11:30", endTime: "12:00", patient: "", type: "Travel", colour: "bg-gray-100 border-gray-300 text-gray-500" },
  { id: "3", time: "13:00", endTime: "14:30", patient: "Cooper", type: "Rehab Initial", colour: "bg-purple-100 border-purple-300 text-purple-800" },
  { id: "4", time: "15:00", endTime: "16:00", patient: "Thunder", type: "Equine Biomech", colour: "bg-amber-100 border-amber-300 text-amber-800" },
];

export default function CalendarPage() {
  const [view, setView] = useState("day");
  const [currentDate] = useState(today);

  const formattedDate = currentDate.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
          <Button variant="outline" size="icon" className="min-w-[44px] min-h-[44px]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {formattedDate}
          </span>
          <Button variant="outline" size="icon" className="min-w-[44px] min-h-[44px]">
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
          {mockAppointments.map((apt) => (
            <Card
              key={apt.id}
              className={`border-l-4 ${apt.colour} cursor-pointer hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {apt.time} – {apt.endTime}
                    </p>
                    {apt.patient ? (
                      <>
                        <p className="text-sm font-semibold mt-1">{apt.patient}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {apt.type}
                        </Badge>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {apt.type} buffer
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
}
