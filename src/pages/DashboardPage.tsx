import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  GraduationCap,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { fetchStudents } from "@/services/api/students";
import { fetchFaculty } from "@/services/api/faculty";
import {
  fetchSchedules,
  fetchScheduleConflicts,
} from "@/services/api/scheduling";
import { fetchAcademicOptions } from "@/services/api/academic";

export function DashboardPage() {
  const [stats, setStats] = useState<{
    students: number;
    faculty: number;
    published: number;
    drafts: number;
    conflicts: number;
  }>({ students: 0, faculty: 0, published: 0, drafts: 0, conflicts: 0 });
  const [terms, setTerms] = useState<
    Array<{
      id: number;
      academic_year: string;
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
        const academicOptions = await fetchAcademicOptions();
        if (!active) return;
        setTerms(academicOptions.terms);

        const currentAcademicTerm =
          academicOptions.terms.find((term) => term.is_current) ??
          academicOptions.terms[0];

        const [studentsResult, facultyResult] = await Promise.allSettled([
          fetchStudents({ per_page: 10 }),
          fetchFaculty({ per_page: 10 }),
        ]);
        if (!active) return;

        if (studentsResult.status === "fulfilled") {
          setStats((s) => ({ ...s, students: studentsResult.value.pagination.total }));
        }
        if (facultyResult.status === "fulfilled") {
          setStats((s) => ({ ...s, faculty: facultyResult.value.pagination.total }));
        }

        if (currentAcademicTerm) {
          const [publishedResult, draftsResult, conflictsResult] = await Promise.allSettled([
            fetchSchedules({ academic_term_id: currentAcademicTerm.id, status: "published", per_page: 1 }),
            fetchSchedules({ academic_term_id: currentAcademicTerm.id, status: "draft", per_page: 1 }),
            fetchScheduleConflicts(currentAcademicTerm.id),
          ]);
          if (!active) return;

          if (publishedResult.status === "fulfilled") {
            setStats((s) => ({ ...s, published: publishedResult.value.pagination.total }));
          }
          if (draftsResult.status === "fulfilled") {
            setStats((s) => ({ ...s, drafts: draftsResult.value.pagination.total }));
          }
          if (conflictsResult.status === "fulfilled") {
            const open = conflictsResult.value.conflicts.filter((c) => c.status === "open").length;
            setStats((s) => ({ ...s, conflicts: open }));
          }
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
  const attention = [
    stats.conflicts > 0
      ? { label: `${stats.conflicts} open schedule conflict${stats.conflicts === 1 ? "" : "s"}`, to: "/scheduling", tone: "warning" as const }
      : null,
    stats.drafts > 0
      ? { label: `${stats.drafts} draft schedule${stats.drafts === 1 ? "" : "s"} awaiting review`, to: "/scheduling", tone: "info" as const }
      : null,
    !currentTerm
      ? { label: "No current academic term configured", to: "/academic/terms", tone: "warning" as const }
      : null,
  ].filter(Boolean) as Array<{ label: string; to: string; tone: "warning" | "info" }>;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Current term status, scheduling attention, and quick access to the Intelligent Scheduling workspace."
        actions={
          <Link to="/scheduling">
            <Button leftIcon={<CalendarDays className="size-4" aria-hidden="true" />}>
              Open schedule
            </Button>
          </Link>
        }
      />

      {error ? (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">Current academic term</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">
                  {loading ? "Loading…" : currentTerm ? `${currentTerm.academic_year} · ${currentTerm.name}` : "No current term"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Scheduling readiness and publication status for the active term.
                </p>
              </div>
              {currentTerm ? <Badge tone={currentTerm.status === "active" ? "success" : "warning"}>{currentTerm.status}</Badge> : null}
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" /> Published schedules
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{loading ? "—" : stats.published}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <CircleDot className="size-3.5 text-amber-600" aria-hidden="true" /> Draft schedules
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{loading ? "—" : stats.drafts}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <AlertTriangle className="size-3.5 text-red-600" aria-hidden="true" /> Open conflicts
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{loading ? "—" : stats.conflicts}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <Link to="/scheduling" className="text-sm font-medium text-maroon-700 hover:text-maroon-800">
                Go to Intelligent Scheduling <ArrowRight className="inline size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Directory snapshot</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Current counts for people records in CCSync.</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-stone-50 text-maroon-700">
                  <Users className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Students</dt>
                  <dd className="text-lg font-semibold tabular-nums text-ink">{loading ? "—" : stats.students}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-stone-50 text-maroon-700">
                  <GraduationCap className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Faculty</dt>
                  <dd className="text-lg font-semibold tabular-nums text-ink">{loading ? "—" : stats.faculty}</dd>
                </div>
              </div>
            </dl>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Requires attention</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Items that may affect scheduling or term readiness.</p>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-ink-muted">Checking…</p>
              ) : attention.length ? (
                attention.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <Badge tone={item.tone}>{item.tone === "warning" ? "Attention" : "Review"}</Badge>
                      <span>{item.label}</span>
                    </div>
                    <Link to={item.to} className="text-xs font-semibold text-maroon-700 hover:text-maroon-800">View</Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">No scheduling issues detected for the current term.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Quick links</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {[
                { to: "/academic/subject-offerings", label: "Class assignments" },
                { to: "/faculty", label: "Faculty availability & workload" },
                { to: "/rooms", label: "Room inventory" },
                { to: "/activities?view=announcements", label: "Campus announcements" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="flex items-center justify-between py-2.5 text-ink hover:text-maroon-700">
                    {link.label}
                    <ArrowRight className="size-3.5 text-ink-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
