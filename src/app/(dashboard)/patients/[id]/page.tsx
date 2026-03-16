import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  Scale,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── helpers ────────────────────────────────────────────────────────────────

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  horse: "🐴",
  other: "🐾",
};

function calcAge(dob: string | null): string {
  if (!dob) return "Unknown";
  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) return `${totalMonths}mo`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}yr ${m}mo` : `${y}yr`;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  deceased: "destructive",
  transferred: "outline",
};

const consultStatusStyle: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  finalised:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// ─── page ────────────────────────────────────────────────────────────────────

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch patient with owner joined
  const { data: patient } = await supabase
    .from("patients")
    .select(
      `
      id,
      name,
      species,
      breed,
      sex,
      dob,
      microchip,
      status,
      allergies,
      conditions,
      practice_id,
      owner:clients!owner_id (
        id,
        name,
        email,
        phone
      )
    `
    )
    .eq("id", id)
    .single();

  if (!patient) notFound();

  // Verify the user can access this patient's practice
  const { data: practiceAccess } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id)
    .eq("practice_id", patient.practice_id)
    .maybeSingle();

  if (!practiceAccess) notFound();

  // Parallel fetches
  const [weightsResult, consultsResult, filesResult] = await Promise.all([
    supabase
      .from("patient_weights")
      .select("id, weight_kg, recorded_at, notes")
      .eq("patient_id", id)
      .order("recorded_at", { ascending: false }),

    supabase
      .from("consults")
      .select(
        "id, consult_date, template_used, status, presenting_complaint"
      )
      .eq("patient_id", id)
      .order("consult_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("file_attachments")
      .select("id, file_name, file_type, file_size, created_at")
      .eq("patient_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const weights = weightsResult.data ?? [];
  const consults = consultsResult.data ?? [];
  const files = filesResult.data ?? [];

  // Resolve owner (Supabase may return array or object)
  const ownerRaw = patient.owner;
  const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;

  const latestWeight = weights.length > 0 ? weights[0] : null;
  const allergies: string[] = (patient.allergies as string[] | null) ?? [];
  const conditions: string[] = (patient.conditions as string[] | null) ?? [];

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {speciesEmoji[patient.species as string] ?? speciesEmoji.other}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {patient.name as string}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {patient.species as string}
            </Badge>
            <Badge variant={statusVariant[(patient.status as string) ?? "active"] ?? "outline"}>
              {patient.status as string}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patient.breed ? `${patient.breed} · ` : ""}
            {(patient.sex as string) ? `${patient.sex} · ` : ""}
            Age: {calcAge(patient.dob as string | null)}
          </p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{owner?.name ?? "Unknown Owner"}</span>
            {owner?.phone && (
              <>
                <span aria-hidden="true">·</span>
                <span>{owner.phone}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {(allergies.length > 0 || conditions.length > 0) && (
        <div className="space-y-2">
          {allergies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Allergies:
              </span>
              {allergies.map((a) => (
                <Badge
                  key={a}
                  variant="destructive"
                  className="text-xs"
                >
                  {a}
                </Badge>
              ))}
            </div>
          )}
          {conditions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Conditions:
              </span>
              {conditions.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 text-xs dark:bg-amber-900/40 dark:text-amber-300"
                >
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* ── Main column ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card size="sm">
              <CardContent className="flex flex-col gap-1 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  Weight
                </div>
                <p className="text-lg font-semibold leading-none">
                  {latestWeight
                    ? `${latestWeight.weight_kg} kg`
                    : "—"}
                </p>
                {latestWeight && (
                  <p className="text-[10px] text-muted-foreground">
                    {fmtDate(latestWeight.recorded_at)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-1 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Consults
                </div>
                <p className="text-lg font-semibold leading-none">
                  {consults.length}
                </p>
                {consults.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Last: {fmtDate(consults[0].consult_date)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-1 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Files
                </div>
                <p className="text-lg font-semibold leading-none">
                  {files.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Medical Timeline */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Medical Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {consults.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No consults recorded yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {consults.map((consult) => {
                    const complaint = consult.presenting_complaint as
                      | string
                      | null;
                    const preview = complaint
                      ? complaint.length > 100
                        ? complaint.slice(0, 100) + "…"
                        : complaint
                      : null;
                    const status = (consult.status as string) ?? "draft";
                    const template = consult.template_used as string | null;

                    return (
                      <li key={consult.id}>
                        <Link
                          href={`/consults/${consult.id}`}
                          className="flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 active:bg-accent"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">
                                {fmtDate(consult.consult_date as string | null)}
                              </span>
                              {template && (
                                <span className="text-xs text-muted-foreground">
                                  {template}
                                </span>
                              )}
                              <Badge
                                variant="secondary"
                                className={`text-[10px] capitalize ${consultStatusStyle[status] ?? ""}`}
                              >
                                {status}
                              </Badge>
                            </div>
                            {preview && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {preview}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* File Attachments (mobile: shown inline; desktop: sidebar handles it) */}
          {files.length > 0 && (
            <Card className="lg:hidden">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FileList files={files} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar (desktop only) ──────────────────────────────────── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4">
          {/* Weight History */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Weight History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {weights.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No weight records.
                </p>
              ) : (
                <WeightList weights={weights} />
              )}
            </CardContent>
          </Card>

          {/* File Attachments */}
          {files.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FileList files={files} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Weight History — mobile only (below main content) */}
      <Card className="lg:hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Weight History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {weights.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No weight records.
            </p>
          ) : (
            <WeightList weights={weights} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

type WeightRow = {
  id: string;
  weight_kg: number;
  recorded_at: string;
  notes: string | null;
};

function WeightList({ weights }: { weights: WeightRow[] }) {
  return (
    <ul className="divide-y">
      {weights.map((w, idx) => {
        const prev = weights[idx + 1];
        const delta = prev ? w.weight_kg - prev.weight_kg : null;
        const deltaAbs = delta !== null ? Math.abs(delta) : null;

        return (
          <li key={w.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{w.weight_kg} kg</span>
                {delta !== null && deltaAbs !== null && deltaAbs > 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      delta > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {delta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtDate(w.recorded_at)}
              </p>
              {w.notes && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {w.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type FileRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

function FileList({ files }: { files: FileRow[] }) {
  return (
    <ul className="divide-y">
      {files.map((f) => {
        const sizeKb = (f.file_size / 1024).toFixed(0);
        return (
          <li key={f.id} className="flex items-start gap-3 px-4 py-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{f.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {f.file_type} · {sizeKb} KB · {fmtDate(f.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
