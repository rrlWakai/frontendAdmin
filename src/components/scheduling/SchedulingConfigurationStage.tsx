import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarClock, Check, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { SelectField } from '@/components/common/SelectField'
import { TextAreaField } from '@/components/common/TextAreaField'
import { TextField } from '@/components/common/TextField'
import { useAuth } from '@/hooks/useAuth'
import {
  approveSchedulingMeetingPlan,
  approveSchedulingTimeGrid,
  createSchedulingMeetingPlan,
  createSchedulingTimeGrid,
  deleteSchedulingMeetingPlan,
  deleteSchedulingTimeGrid,
  fetchSchedulingMeetingPlans,
  fetchSchedulingTimeGrid,
  reviseSchedulingMeetingPlan,
  reviseSchedulingTimeGrid,
  updateSchedulingMeetingPlan,
  updateSchedulingTimeGrid,
} from '@/services/api/scheduling'
import type {
  ScheduleModality,
  ScheduleType,
  SchedulingMeetingPlan,
  SchedulingMeetingPlanEntry,
  SchedulingMeetingPlanIndex,
  SchedulingMeetingRequirementInput,
  SchedulingTimeGrid,
  SchedulingTimeGridIndex,
} from '@/types/scheduling'
import { getApiErrorMessage } from '@/utils/apiError'
import { cn } from '@/utils/cn'

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const MEETING_TYPE_OPTIONS = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'other', label: 'Other' },
]

const MODALITY_OPTIONS = [
  { value: 'face_to_face', label: 'Face to face' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
]

const ROOM_TYPE_OPTIONS = [
  { value: '', label: 'No specific room type' },
  { value: 'lecture', label: 'Lecture room' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'seminar', label: 'Seminar room' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
]

interface TimeGridDayDraft {
  day_of_week: number
  operating_start: string
  operating_end: string
  slots: string
}

interface RequirementDraft {
  meeting_type: ScheduleType
  frequency_per_week: string
  duration_minutes: string
  modality: ScheduleModality
  required_room_type: string
  mandatory: boolean
  allowed_days: number[]
  valid_start_times: string
}

interface SchedulingConfigurationStageProps {
  termId: number | null
  onConfigurationChanged: () => void
}

type ConfirmAction =
  | { kind: 'discard-time-grid'; id: number }
  | { kind: 'discard-meeting-plan'; id: number }

function dayLabel(day: number): string {
  return DAY_LABELS[day - 1] ?? `Day ${day}`
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'draft') return 'warning'
  return 'neutral'
}

function emptyRequirement(): RequirementDraft {
  return {
    meeting_type: 'lecture',
    frequency_per_week: '1',
    duration_minutes: '60',
    modality: 'face_to_face',
    required_room_type: 'lecture',
    mandatory: true,
    allowed_days: [],
    valid_start_times: '',
  }
}

function requirementToDraft(requirement: SchedulingMeetingPlan['requirements'][number]): RequirementDraft {
  return {
    meeting_type: requirement.meeting_type,
    frequency_per_week: String(requirement.frequency_per_week),
    duration_minutes: String(requirement.duration_minutes),
    modality: requirement.modality,
    required_room_type: requirement.required_room_type ?? '',
    mandatory: requirement.mandatory,
    allowed_days: requirement.allowed_days ?? [],
    valid_start_times: (requirement.valid_start_times ?? []).join(', '),
  }
}

function draftToRequirement(draft: RequirementDraft): SchedulingMeetingRequirementInput {
  const startTimes = draft.valid_start_times
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    meeting_type: draft.meeting_type,
    frequency_per_week: Number(draft.frequency_per_week),
    duration_minutes: Number(draft.duration_minutes),
    modality: draft.modality,
    required_room_type: draft.modality === 'online' ? null : draft.required_room_type || null,
    mandatory: draft.mandatory,
    allowed_days: draft.allowed_days.length ? [...draft.allowed_days].sort((a, b) => a - b) : null,
    valid_start_times: startTimes.length ? startTimes.sort() : null,
  }
}

function timeGridToDays(grid: SchedulingTimeGrid | null): TimeGridDayDraft[] {
  if (!grid) return []

  return grid.days
    .slice()
    .sort((left, right) => left.day_of_week - right.day_of_week)
    .map((day) => ({
      day_of_week: day.day_of_week,
      operating_start: day.operating_start,
      operating_end: day.operating_end,
      slots: day.slots
        .slice()
        .sort((left, right) => left.start_time.localeCompare(right.start_time))
        .map((slot) => `${slot.start_time}-${slot.end_time}`)
        .join(', '),
    }))
}

function parseSlots(value: string): Array<{ start_time: string; end_time: string }> {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [startTime, endTime] = part.split('-').map((piece) => piece.trim())
      return { start_time: startTime ?? '', end_time: endTime ?? '' }
    })
}

export function SchedulingConfigurationStage({
  termId,
  onConfigurationChanged,
}: SchedulingConfigurationStageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const [tab, setTab] = useState<'time-grid' | 'meeting-plans'>('time-grid')
  const [timeGridIndex, setTimeGridIndex] = useState<SchedulingTimeGridIndex | null>(null)
  const [meetingPlanIndex, setMeetingPlanIndex] = useState<SchedulingMeetingPlanIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  const [timezone, setTimezone] = useState('Asia/Manila')
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<TimeGridDayDraft[]>([])
  const [editingTimeGridId, setEditingTimeGridId] = useState<number | null>(null)

  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null)
  const [planNotes, setPlanNotes] = useState('')
  const [requirements, setRequirements] = useState<RequirementDraft[]>([])
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  function applyTimeGrid(grid: SchedulingTimeGrid | null) {
    setEditingTimeGridId(grid?.status === 'draft' ? grid.id : null)
    setTimezone(grid?.timezone ?? 'Asia/Manila')
    setNotes(grid?.notes ?? '')
    setDays(timeGridToDays(grid))
  }

  useEffect(() => {
    let active = true
    if (!termId) return () => { active = false }

    void Promise.resolve().then(async () => {
      setLoading(true)
      setError(null)
      try {
        const [timeGrid, meetingPlans] = await Promise.all([
          fetchSchedulingTimeGrid(termId),
          fetchSchedulingMeetingPlans(termId),
        ])
        if (!active) return
        setTimeGridIndex(timeGrid)
        setMeetingPlanIndex(meetingPlans)
        applyTimeGrid(timeGrid.current)
        setSelectedOfferingId(null)
        setEditingPlanId(null)
        setRequirements([])
        setPlanNotes('')
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load scheduling configuration.'))
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => { active = false }
  }, [reloadVersion, termId])

  async function reload(message?: string) {
    setActionMessage(message ?? null)
    setActionError(null)
    setReloadVersion((value) => value + 1)
    onConfigurationChanged()
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key)
    setActionError(null)
    setActionMessage(null)
    try {
      await action()
    } catch (failure) {
      setActionError(getApiErrorMessage(failure, 'Unable to save scheduling configuration.'))
    } finally {
      setBusy(null)
    }
  }

  function timeGridInput() {
    return {
      timezone: timezone.trim(),
      notes: notes.trim() || null,
      days: days
        .slice()
        .sort((left, right) => left.day_of_week - right.day_of_week)
        .map((day) => ({
          day_of_week: day.day_of_week,
          operating_start: day.operating_start,
          operating_end: day.operating_end,
          slots: parseSlots(day.slots),
        })),
    }
  }

  async function saveTimeGrid() {
    if (!termId) return
    await runAction('save-time-grid', async () => {
      if (editingTimeGridId) {
        await updateSchedulingTimeGrid(editingTimeGridId, timeGridInput())
      } else {
        await createSchedulingTimeGrid({ ...timeGridInput(), academic_term_id: termId })
      }
      await reload('Time grid draft saved.')
    })
  }

  async function approveTimeGrid() {
    if (!editingTimeGridId) return
    await runAction('approve-time-grid', async () => {
      await approveSchedulingTimeGrid(editingTimeGridId)
      await reload('Time grid approved. Generation now uses this version.')
    })
  }

  async function reviseTimeGrid(id: number) {
    await runAction('revise-time-grid', async () => {
      await reviseSchedulingTimeGrid(id)
      await reload('A new time grid revision was created as a draft.')
    })
  }

  async function discardTimeGrid(id: number) {
    await runAction('discard-time-grid', async () => {
      await deleteSchedulingTimeGrid(id)
      setConfirmAction(null)
      await reload('Time grid draft discarded.')
    })
  }

  function addDay(dayOfWeek: string) {
    const value = Number(dayOfWeek)
    if (!value || days.some((day) => day.day_of_week === value)) return
    setDays((current) => [
      ...current,
      {
        day_of_week: value,
        operating_start: '08:00',
        operating_end: '17:00',
        slots: '',
      },
    ].sort((left, right) => left.day_of_week - right.day_of_week))
  }

  function updateDay(dayOfWeek: number, patch: Partial<TimeGridDayDraft>) {
    setDays((current) => current.map((day) => (
      day.day_of_week === dayOfWeek ? { ...day, ...patch } : day
    )))
  }

  function removeDay(dayOfWeek: number) {
    setDays((current) => current.filter((day) => day.day_of_week !== dayOfWeek))
  }

  function openMeetingPlan(entry: SchedulingMeetingPlanEntry) {
    setActionError(null)
    setActionMessage(null)
    setSelectedOfferingId(entry.offering.id)
    setPlanNotes(entry.current?.notes ?? '')
    setEditingPlanId(entry.current?.status === 'draft' ? entry.current.id : null)
    setRequirements(
      entry.current?.requirements.length
        ? entry.current.requirements.map(requirementToDraft)
        : [emptyRequirement()],
    )
  }

  async function startRevision(entry: SchedulingMeetingPlanEntry) {
    if (!entry.current) return
    await runAction(`revise-plan-${entry.offering.id}`, async () => {
      const plan = await reviseSchedulingMeetingPlan(entry.current!.id)
      setEditingPlanId(plan.id)
      setSelectedOfferingId(entry.offering.id)
      setPlanNotes(plan.notes ?? '')
      setRequirements(plan.requirements.map(requirementToDraft))
      await reload('A new meeting plan revision was created as a draft.')
    })
  }

  async function saveMeetingPlan() {
    if (!selectedOfferingId) return
    await runAction('save-meeting-plan', async () => {
      const payload = {
        subject_offering_id: selectedOfferingId,
        notes: planNotes.trim() || null,
        requirements: requirements.map(draftToRequirement),
      }

      if (editingPlanId) {
        await updateSchedulingMeetingPlan(editingPlanId, payload)
      } else {
        await createSchedulingMeetingPlan(payload)
      }

      setSelectedOfferingId(null)
      setEditingPlanId(null)
      setRequirements([])
      await reload('Meeting plan draft saved.')
    })
  }

  async function approveMeetingPlan() {
    if (!editingPlanId) return
    await runAction('approve-meeting-plan', async () => {
      await approveSchedulingMeetingPlan(editingPlanId)
      setSelectedOfferingId(null)
      setEditingPlanId(null)
      setRequirements([])
      await reload('Meeting plan approved. Generation now uses this version.')
    })
  }

  async function discardMeetingPlan(id: number) {
    await runAction('discard-meeting-plan', async () => {
      await deleteSchedulingMeetingPlan(id)
      setConfirmAction(null)
      setSelectedOfferingId(null)
      setEditingPlanId(null)
      setRequirements([])
      await reload('Meeting plan draft discarded.')
    })
  }

  function updateRequirement(index: number, patch: Partial<RequirementDraft>) {
    setRequirements((current) => current.map((requirement, currentIndex) => (
      currentIndex === index ? { ...requirement, ...patch } : requirement
    )))
  }

  function toggleRequirementDay(index: number, day: number) {
    setRequirements((current) => current.map((requirement, currentIndex) => {
      if (currentIndex !== index) return requirement
      const allowedDays = requirement.allowed_days.includes(day)
        ? requirement.allowed_days.filter((value) => value !== day)
        : [...requirement.allowed_days, day]
      return { ...requirement, allowed_days: allowedDays.sort((a, b) => a - b) }
    }))
  }

  const currentTimeGrid = timeGridIndex?.current ?? null
  const canEditTimeGrid = currentTimeGrid?.status === 'draft'
  const selectedEntry = meetingPlanIndex?.plans.find(
    (entry) => entry.offering.id === selectedOfferingId,
  )

  if (!termId) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Select an academic term"
        description="Choose a term before configuring scheduling."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Academic scheduling configuration</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Configure the fixed weekly time grid and the meeting requirements for each open class assignment. An administrator must approve each version before generation can use it.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('time-grid')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === 'time-grid' ? 'bg-maroon-50 text-maroon-800' : 'text-ink-muted hover:text-ink',
            )}
          >
            Time grid
          </button>
          <button
            type="button"
            onClick={() => setTab('meeting-plans')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === 'meeting-plans' ? 'bg-maroon-50 text-maroon-800' : 'text-ink-muted hover:text-ink',
            )}
          >
            Meeting plans
          </button>
        </div>
      </div>

      {actionError ? <InlineAlert tone="danger">{actionError}</InlineAlert> : null}
      {actionMessage ? <InlineAlert tone="success">{actionMessage}</InlineAlert> : null}

      {loading ? (
        <Card><CardBody><p className="text-sm text-ink-muted">Loading scheduling configuration…</p></CardBody></Card>
      ) : error ? (
        <InlineAlert tone="danger">{error}</InlineAlert>
      ) : tab === 'time-grid' ? (
        <TimeGridPanel
          current={currentTimeGrid}
          history={timeGridIndex?.history ?? []}
          timezone={timezone}
          notes={notes}
          days={days}
          canEdit={canEditTimeGrid}
          isAdmin={isAdmin}
          busy={busy}
          onTimezoneChange={setTimezone}
          onNotesChange={setNotes}
          onAddDay={addDay}
          onUpdateDay={updateDay}
          onRemoveDay={removeDay}
          onSave={() => void saveTimeGrid()}
          onApprove={() => void approveTimeGrid()}
          onRevise={(id) => void reviseTimeGrid(id)}
          onDiscard={(id) => setConfirmAction({ kind: 'discard-time-grid', id })}
        />
      ) : (
        <MeetingPlansPanel
          plans={meetingPlanIndex?.plans ?? []}
          selectedEntry={selectedEntry}
          selectedOfferingId={selectedOfferingId}
          editingPlanId={editingPlanId}
          planNotes={planNotes}
          requirements={requirements}
          busy={busy}
          isAdmin={isAdmin}
          onOpen={openMeetingPlan}
          onRevise={(entry) => void startRevision(entry)}
          onClose={() => {
            setSelectedOfferingId(null)
            setEditingPlanId(null)
            setRequirements([])
          }}
          onPlanNotesChange={setPlanNotes}
          onAddRequirement={() => setRequirements((current) => [...current, emptyRequirement()])}
          onRemoveRequirement={(index) => setRequirements((current) => current.filter((_, currentIndex) => currentIndex !== index))}
          onUpdateRequirement={updateRequirement}
          onToggleDay={toggleRequirementDay}
          onSave={() => void saveMeetingPlan()}
          onApprove={() => void approveMeetingPlan()}
          onDiscard={(id) => setConfirmAction({ kind: 'discard-meeting-plan', id })}
        />
      )}

      {confirmAction ? (
        <ConfirmationDialog
          title={confirmAction.kind === 'discard-time-grid' ? 'Discard time grid draft?' : 'Discard meeting plan draft?'}
          description="This removes the unapproved draft. Approved versions and history are not changed."
          confirmLabel="Discard draft"
          destructive
          isLoading={busy === 'discard-time-grid' || busy === 'discard-meeting-plan'}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.kind === 'discard-time-grid') void discardTimeGrid(confirmAction.id)
            else void discardMeetingPlan(confirmAction.id)
          }}
        />
      ) : null}
    </div>
  )
}

function TimeGridPanel({
  current,
  history,
  timezone,
  notes,
  days,
  canEdit,
  isAdmin,
  busy,
  onTimezoneChange,
  onNotesChange,
  onAddDay,
  onUpdateDay,
  onRemoveDay,
  onSave,
  onApprove,
  onRevise,
  onDiscard,
}: {
  current: SchedulingTimeGrid | null
  history: SchedulingTimeGrid[]
  timezone: string
  notes: string
  days: TimeGridDayDraft[]
  canEdit: boolean
  isAdmin: boolean
  busy: string | null
  onTimezoneChange: (value: string) => void
  onNotesChange: (value: string) => void
  onAddDay: (value: string) => void
  onUpdateDay: (day: number, patch: Partial<TimeGridDayDraft>) => void
  onRemoveDay: (day: number) => void
  onSave: () => void
  onApprove: () => void
  onRevise: (id: number) => void
  onDiscard: (id: number) => void
}) {
  const availableDays = DAY_LABELS
    .map((label, index) => ({ value: String(index + 1), label }))
    .filter((option) => !days.some((day) => String(day.day_of_week) === option.value))

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Weekly time grid</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Only Monday through Friday are supported. Every fixed slot must sit inside the operating hours and must not overlap another slot.
            </p>
          </div>
          {current ? (
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(current.status)}>{current.status}</Badge>
              <span className="text-xs text-ink-muted">v{current.version}</span>
            </div>
          ) : null}
        </CardHeader>
        <CardBody className="space-y-5">
          {current?.status === 'approved' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-sm font-medium text-emerald-900">Approved time grid in use</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                {current.timezone} · approved {current.approved_at ? new Date(current.approved_at).toLocaleString() : '—'}
                {current.approved_by ? ` by ${current.approved_by.name}` : ''}. Approved versions are immutable; create a revision to change them.
              </p>
            </div>
          ) : null}

          {canEdit || !current ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Timezone"
                  value={timezone}
                  onChange={(event) => onTimezoneChange(event.target.value)}
                  hint="IANA timezone, for example Asia/Manila."
                  placeholder="Asia/Manila"
                />
                <SelectField
                  label="Add applicable day"
                  value=""
                  options={availableDays}
                  onChange={onAddDay}
                  placeholder={availableDays.length ? 'Select a day' : 'All weekdays added'}
                  disabled={!availableDays.length}
                />
              </div>

              <div className="space-y-3">
                {days.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-ink-muted">
                    Add at least one weekday, then define its operating hours and fixed slots.
                  </div>
                ) : null}

                {days.map((day) => (
                  <div key={day.day_of_week} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{dayLabel(day.day_of_week)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                        onClick={() => onRemoveDay(day.day_of_week)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <TextField
                        label="Operating start"
                        type="time"
                        value={day.operating_start}
                        onChange={(event) => onUpdateDay(day.day_of_week, { operating_start: event.target.value })}
                      />
                      <TextField
                        label="Operating end"
                        type="time"
                        value={day.operating_end}
                        onChange={(event) => onUpdateDay(day.day_of_week, { operating_end: event.target.value })}
                      />
                    </div>
                    <TextField
                      className="mt-3"
                      label="Fixed slots"
                      value={day.slots}
                      onChange={(event) => onUpdateDay(day.day_of_week, { slots: event.target.value })}
                      placeholder="08:00-09:00, 09:00-10:00"
                      hint="Comma-separated start-end pairs. Example: 08:00-09:00, 09:00-10:00."
                    />
                  </div>
                ))}
              </div>

              <TextAreaField
                label="Notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={2}
                placeholder="Optional internal notes about this version."
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={onSave}
                  isLoading={busy === 'save-time-grid'}
                  leftIcon={<Check className="size-4" aria-hidden="true" />}
                >
                  {canEdit ? 'Save draft' : 'Create draft'}
                </Button>
                {canEdit && isAdmin ? (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={onApprove}
                    isLoading={busy === 'approve-time-grid'}
                  >
                    Approve time grid
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => current && onDiscard(current.id)}
                    isLoading={busy === 'discard-time-grid'}
                  >
                    Discard draft
                  </Button>
                ) : null}
              </div>
              {canEdit && !isAdmin ? (
                <p className="text-xs text-ink-muted">
                  An administrator must approve this draft before it can be used for generation.
                </p>
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              <TimeGridSummary grid={current} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => current && onRevise(current.id)}
                  isLoading={busy === 'revise-time-grid'}
                >
                  Create revision
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-ink">Version history</h3>
        </CardHeader>
        <CardBody>
          {history.length === 0 ? (
            <p className="text-sm text-ink-muted">No time grid versions yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((grid) => (
                <li key={grid.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">v{grid.version}</span>
                    <Badge tone={statusTone(grid.status)}>{grid.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {grid.timezone} · {grid.days.length} day{grid.days.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {grid.approved_at ? `Approved ${new Date(grid.approved_at).toLocaleDateString()}` : 'Not approved'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function TimeGridSummary({ grid }: { grid: SchedulingTimeGrid | null }) {
  if (!grid) return null

  return (
    <div className="space-y-3">
      {grid.days
        .slice()
        .sort((left, right) => left.day_of_week - right.day_of_week)
        .map((day) => (
          <div key={day.id} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{dayLabel(day.day_of_week)}</p>
              <p className="text-xs text-ink-muted">{day.operating_start}–{day.operating_end}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {day.slots.map((slot) => (
                <span key={slot.id} className="rounded-md bg-surface-soft px-2 py-1 text-[11px] font-medium text-ink-muted">
                  {slot.start_time}–{slot.end_time}
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

function MeetingPlansPanel({
  plans,
  selectedEntry,
  selectedOfferingId,
  editingPlanId,
  planNotes,
  requirements,
  busy,
  isAdmin,
  onOpen,
  onRevise,
  onClose,
  onPlanNotesChange,
  onAddRequirement,
  onRemoveRequirement,
  onUpdateRequirement,
  onToggleDay,
  onSave,
  onApprove,
  onDiscard,
}: {
  plans: SchedulingMeetingPlanEntry[]
  selectedEntry: SchedulingMeetingPlanEntry | undefined
  selectedOfferingId: number | null
  editingPlanId: number | null
  planNotes: string
  requirements: RequirementDraft[]
  busy: string | null
  isAdmin: boolean
  onOpen: (entry: SchedulingMeetingPlanEntry) => void
  onRevise: (entry: SchedulingMeetingPlanEntry) => void
  onClose: () => void
  onPlanNotesChange: (value: string) => void
  onAddRequirement: () => void
  onRemoveRequirement: (index: number) => void
  onUpdateRequirement: (index: number, patch: Partial<RequirementDraft>) => void
  onToggleDay: (index: number, day: number) => void
  onSave: () => void
  onApprove: () => void
  onDiscard: (id: number) => void
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Class assignment meeting plans</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Every open class assignment needs an approved plan. Requirements describe weekly frequency, duration, modality, room type, and optional day/start-time restrictions.
            </p>
          </div>
          <Badge tone="neutral">{plans.length} open</Badge>
        </CardHeader>
        <CardBody>
          {plans.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No open class assignments"
              description="Open class assignments for this term before configuring meeting plans."
            />
          ) : (
            <div className="divide-y divide-line">
              {plans.map((entry) => {
                const plan = entry.current
                return (
                  <div key={entry.offering.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {entry.offering.subject?.code ?? 'Class assignment'} · {entry.offering.section?.code ?? '—'}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {entry.offering.subject?.title ?? 'Untitled subject'}
                        {entry.offering.subject?.lecture_hours != null ? ` · ${entry.offering.subject.lecture_hours}h lecture` : ''}
                        {entry.offering.subject?.lab_hours != null ? ` · ${entry.offering.subject.lab_hours}h lab` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan ? <Badge tone={statusTone(plan.status)}>{plan.status}</Badge> : <Badge tone="danger">missing</Badge>}
                      {plan ? <span className="text-xs text-ink-muted">v{plan.version}</span> : null}
                      {!plan ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(entry)}>
                          Configure
                        </Button>
                      ) : plan.status === 'draft' ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(entry)}>
                          Edit draft
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onRevise(entry)}
                          isLoading={busy === `revise-plan-${entry.offering.id}`}
                        >
                          Create revision
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {selectedEntry && selectedOfferingId ? (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                {selectedEntry.offering.subject?.code ?? 'Class assignment'} · {selectedEntry.offering.section?.code ?? '—'}
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                {editingPlanId ? 'Editing an unapproved draft.' : 'Creating a new draft.'}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {requirements.map((requirement, index) => (
              <div key={index} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">Requirement {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={() => onRemoveRequirement(index)}
                    disabled={requirements.length === 1}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField
                    label="Meeting type"
                    value={requirement.meeting_type}
                    options={MEETING_TYPE_OPTIONS}
                    onChange={(value) => onUpdateRequirement(index, { meeting_type: value as ScheduleType })}
                  />
                  <TextField
                    label="Frequency per week"
                    type="number"
                    min={1}
                    max={14}
                    value={requirement.frequency_per_week}
                    onChange={(event) => onUpdateRequirement(index, { frequency_per_week: event.target.value })}
                  />
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    min={1}
                    max={600}
                    value={requirement.duration_minutes}
                    onChange={(event) => onUpdateRequirement(index, { duration_minutes: event.target.value })}
                  />
                  <SelectField
                    label="Modality"
                    value={requirement.modality}
                    options={MODALITY_OPTIONS}
                    onChange={(value) => onUpdateRequirement(index, {
                      modality: value as ScheduleModality,
                      required_room_type: value === 'online' ? '' : requirement.required_room_type,
                    })}
                  />
                  <SelectField
                    label="Required room type"
                    value={requirement.required_room_type}
                    options={ROOM_TYPE_OPTIONS}
                    onChange={(value) => onUpdateRequirement(index, { required_room_type: value })}
                    disabled={requirement.modality === 'online'}
                  />
                  <TextField
                    label="Valid start times"
                    value={requirement.valid_start_times}
                    onChange={(event) => onUpdateRequirement(index, { valid_start_times: event.target.value })}
                    placeholder="08:00, 09:00"
                    hint="Optional comma-separated times. Leave blank to allow any configured slot."
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={requirement.mandatory}
                      onChange={(event) => onUpdateRequirement(index, { mandatory: event.target.checked })}
                      className="size-4 rounded border-line text-maroon-600 focus:ring-maroon-500"
                    />
                    Mandatory
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink-muted">Allowed days:</span>
                    {DAY_LABELS.map((label, dayIndex) => {
                      const day = dayIndex + 1
                      return (
                        <label key={label} className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <input
                            type="checkbox"
                            checked={requirement.allowed_days.includes(day)}
                            onChange={() => onToggleDay(index, day)}
                            className="size-3.5 rounded border-line text-maroon-600 focus:ring-maroon-500"
                          />
                          {label.slice(0, 3)}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
              onClick={onAddRequirement}
            >
              Add requirement
            </Button>

            <TextAreaField
              label="Notes"
              value={planNotes}
              onChange={(event) => onPlanNotesChange(event.target.value)}
              rows={2}
              placeholder="Optional internal notes about this plan."
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onSave} isLoading={busy === 'save-meeting-plan'}>
                Save draft
              </Button>
              {editingPlanId && isAdmin ? (
                <Button
                  type="button"
                  variant="accent"
                  onClick={onApprove}
                  isLoading={busy === 'approve-meeting-plan'}
                >
                  Approve meeting plan
                </Button>
              ) : null}
              {editingPlanId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDiscard(editingPlanId)}
                  isLoading={busy === 'discard-meeting-plan'}
                >
                  Discard draft
                </Button>
              ) : null}
            </div>
            {editingPlanId && !isAdmin ? (
              <p className="text-xs text-ink-muted">
                An administrator must approve this draft before it can be used for generation.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}

function InlineAlert({ tone, children }: { tone: 'danger' | 'success'; children: ReactNode }) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 text-sm',
      tone === 'danger'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
    )}>
      {children}
    </div>
  )
}
