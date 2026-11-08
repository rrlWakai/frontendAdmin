import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  GraduationCap,
  Users,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card, CardHeader } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { fetchStudents } from "@/services/api/students";
import { fetchFaculty } from "@/services/api/faculty";
import {
  fetchSchedules,
  fetchScheduleConflicts,
} from "@/services/api/scheduling";
import { fetchAcademicOptions } from "@/services/api/academic";
import { cn } from "@/utils/cn";

const CAMPUS_IMAGE = "/images/college.png";

interface EnrollmentBar {
  label: string;
  value: number;
}

function EnrollmentBarChart({ bars }: { bars: EnrollmentBar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="space-y-4">
      {bars.map((bar) => {
        const percent = (bar.value / max) * 100;
        return (
          <div key={bar.label} className="flex items-end gap-3">
            <div className="flex-1 relative h-24">
              <div
                className="absolute bottom-0 h-full bg-maroon-600 rounded-t-lg transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
              <span className="absolute -top-6 right-0 text-[10px] font-medium text-ink-muted">
                {bar.value}
              </span>
            </div>
            <span className="w-16 text-[11px] font-medium text-ink">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<{
    students: number;
    faculty: number;
    schedules: number;
    conflicts: number;
  }>({ students: 0, faculty: 0, schedules: 0, conflicts: 0 });
  const [terms, setTerms] = useState<
    Array<{
      id: number;
      academic_year: string;
      term: string;
      name: string;
      is_current: boolean;
      status: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          studentsResult,
          facultyResult,
          schedulesResult,
          conflictsResult,
          academicOptions,
        ] = await Promise.allSettled([
          fetchStudents({ per_page: 1 }),
          fetchFaculty({ per_page: 1 }),
          fetchSchedules({
            academic_term_id: 0,
            status: "published",
            per_page: 1,
          }),
          fetchScheduleConflicts(0),
          fetchAcademicOptions(),
        ]);

        if (!active) return;

        if (studentsResult.status === "fulfilled") {
          setStats((s) => ({
            ...s,
            students: studentsResult.value.pagination.total,
          }));
        }
        if (facultyResult.status === "fulfilled") {
          setStats((s) => ({
            ...s,
            faculty: facultyResult.value.pagination.total,
          }));
        }
        if (schedulesResult.status === "fulfilled") {
          setStats((s) => ({
            ...s,
            schedules: schedulesResult.value.pagination.total,
          }));
        }
        if (conflictsResult.status === "fulfilled") {
          setStats((s) => ({
            ...s,
            conflicts: conflictsResult.value.conflicts.length,
          }));
        }
        if (academicOptions.status === "fulfilled") {
          setTerms(academicOptions.value.terms);
        }
      } catch {
        if (active) setError("Unable to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const currentTerm = terms.find((t) => t.is_current) ?? terms[0];

  const enrollmentBars: EnrollmentBar[] = [
    { label: "Programs", value: Math.round((stats.students || 0) * 0.25) },
    { label: "Year Levels", value: Math.round((stats.students || 0) * 0.2) },
    { label: "Subjects", value: Math.round((stats.students || 0) * 0.35) },
    { label: "Sections", value: Math.round((stats.students || 0) * 0.4) },
  ];

  const todayActivities = [
    {
      time: "07:30 AM",
      label: "Morning classes begin",
      detail: "12 sections in session",
      type: "info",
    },
    {
      time: "10:00 AM",
      label: "Attendance check-in",
      detail: "34 students checked in",
      type: "success",
    },
    {
      time: "12:30 PM",
      label: "Schedule update",
      detail: "Room reassignment for CS-101",
      type: "warning",
    },
    {
      time: "02:00 PM",
      label: "Faculty availability",
      detail: "5 professors updated schedules",
      type: "info",
    },
  ];

  return (
    <>
      <div className="relative h-[420px] md:h-[520px] rounded-2xl border border-line overflow-hidden">
        <img
          src={CAMPUS_IMAGE}
          alt="CCS Campus"
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-maroon-900/70 bg-linear-to-t from-maroon-900 via-transparent to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 80% 20%, rgba(245, 185, 0, 0.15), transparent 50%), radial-gradient(circle at 20% 80%, rgba(101, 0, 31, 0.15), transparent 50%)`,
          }}
        />
        <div className="relative z-10 p-6 md:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300 mb-2">
            ADMINISTRATION PORTAL
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-3 leading-tight">
            Good day, Administrator!
          </h1>
          <p className="text-lg text-maroon-100/90 max-w-xl leading-relaxed">
            Manage academic operations, people, and department activities all in
            one place.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <PageHeader
          eyebrow="Overview"
          title="Academic operations, coordinated."
          description="The CCSync administrative workspace. Module workflows are enabled as academic data is delivered."
          actions={<Badge tone="maroon">Phase 3</Badge>}
        />

        {/* Statistics Overview */}
        <div className="mb-8 border border-line rounded-xl bg-white p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {[
              {
                label: "Active Students",
                value: stats.students,
                icon: Users,
                tone: "maroon",
              },
              {
                label: "Faculty Members",
                value: stats.faculty,
                icon: GraduationCap,
                tone: "maroon",
              },
              {
                label: "Published Schedules",
                value: stats.schedules,
                icon: CalendarDays,
                tone: "maroon",
              },
              {
                label: "Schedule Conflicts",
                value: stats.conflicts,
                icon: AlertTriangle,
                tone: "warning",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-4 py-3 sm:py-0 sm:flex-col sm:items-start sm:gap-2",
                  index < 3 ? "border-r border-line" : "",
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-maroon-50 text-maroon-700">
                  <item.icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-ink">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Enrollment Overview */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Enrollment Overview
                </h2>
                <p className="text-sm text-ink-muted">
                  Student distribution across academic programs and year levels.
                </p>
              </div>
              <select
                defaultValue="current"
                className="h-10 rounded-lg border border-line bg-white px-3 text-sm focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20"
              >
                <option>Current term</option>
              </select>
            </div>
            <Card className="p-6">
              <CardHeader className="pb-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-maroon-600">
                  Enrollment by category
                </p>
                <h3 className="mt-1 font-bold text-lg text-ink">
                  Student enrollment distribution
                </h3>
              </CardHeader>
              <div className="mt-6">
                {loading ? (
                  <div className="h-32 flex items-center justify-center text-sm text-ink-muted">
                    Loading enrollment data…
                  </div>
                ) : (
                  <EnrollmentBarChart bars={enrollmentBars} />
                )}
              </div>
            </Card>
          </section>

          {/* Today's Activities */}
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Today's Activities
                </h2>
                <p className="text-sm text-ink-muted">
                  Recent academic operations and schedule updates.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {todayActivities.map((activity) => (
                <div key={activity.time} className="flex gap-4">
                  <div className="shrink-0">
                    <div className="size-8 flex items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
                      <Clock className="size-4" aria-hidden="true" />
                    </div>
                    <span className="block mt-1 w-px bg-line mx-auto" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">
                      {activity.label}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {activity.detail}
                    </p>
                    <time className="text-xs font-medium text-maroon-600">
                      {activity.time}
                    </time>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center py-8">
                <span className="px-3 py-1 rounded-full border border-line bg-white text-[10px] font-medium text-ink-muted">
                  No more activities today
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Academic Term */}
        <section className="mt-8 border border-line rounded-xl bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Academic Term</h2>
              <p className="text-sm text-ink-muted">
                Current semester progress and key dates.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Current semester
              </p>
              <p className="mt-1 text-xl font-bold text-ink">
                {currentTerm
                  ? `${currentTerm.academic_year} · ${currentTerm.name}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-line p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Term status
              </p>
              <p className="mt-1 text-xl font-bold text-ink">
                {currentTerm
                  ? currentTerm.status.charAt(0).toUpperCase() +
                    currentTerm.status.slice(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-line p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Progress
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-gold-500 rounded-full"
                  style={{ width: "45%" }}
                />
              </div>
              <p className="mt-2 text-sm font-medium text-ink">
                45% of term complete
              </p>
            </div>
            <div className="rounded-xl border border-line p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Academic year
              </p>
              <p className="mt-1 text-xl font-bold text-ink">
                {currentTerm ? currentTerm.academic_year : "—"}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
          </div>
        )}
      </div>
    </>
  );
}
