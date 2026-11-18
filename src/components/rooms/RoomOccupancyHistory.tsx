import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { fetchRoomOccupancies, resolveRoomDiscrepancy } from '@/services/api/rooms'
import type { RoomOccupancyRecord } from '@/types/room'
import { getApiErrorMessage } from '@/utils/apiError'

interface RoomOccupancyHistoryProps {
  roomId: number
  canResolve: boolean
}

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—'
}

export function RoomOccupancyHistory({ roomId, canResolve }: RoomOccupancyHistoryProps) {
  const [records, setRecords] = useState<RoomOccupancyRecord[]>([])
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRoomOccupancies(roomId, {
        date: date || undefined,
        per_page: 50,
      })
      setRecords(result.occupancies)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to load room occupancy history.'))
    } finally {
      setLoading(false)
    }
  }, [date, roomId])

  useEffect(() => {
    void load()
  }, [load])

  async function resolve(record: RoomOccupancyRecord) {
    const resolutionNotes = notes[record.id]?.trim() ?? ''
    if (resolutionNotes.length < 10) return
    setBusyId(record.id)
    setError(null)
    try {
      await resolveRoomDiscrepancy(record.id, resolutionNotes)
      setNotes((current) => ({ ...current, [record.id]: '' }))
      await load()
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to resolve this discrepancy.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Audit history</p>
          <h3 className="mt-1 text-lg font-semibold">Room occupancy</h3>
        </div>
        <label className="space-y-1 text-xs font-medium text-ink-muted">
          Filter by class date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="block h-10 rounded-lg border border-line px-3 text-sm text-ink"
          />
        </label>
      </div>
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p role="status" className="py-5 text-center text-sm text-ink-muted">Loading occupancy history…</p>
      ) : records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          No room occupancy records for this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{record.subject?.code ?? 'Class'} · {record.section?.code ?? 'Section'}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {record.professor.name ?? 'Professor'} · {record.room.name} ({record.room.code})
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Scheduled {dateTime(record.scheduled_start_at)}–{dateTime(record.scheduled_end_at)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  record.discrepancy_status === 'open'
                    ? 'bg-amber-100 text-amber-900'
                    : record.discrepancy_status === 'resolved'
                      ? 'bg-stone-100 text-stone-700'
                      : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {record.discrepancy_status === 'open' ? 'Discrepancy open' : record.discrepancy_status === 'resolved' ? 'Discrepancy resolved' : 'No discrepancy'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-3">
                <p>Checked in: {dateTime(record.checked_in_at)}</p>
                <p>Checked out: {dateTime(record.checked_out_at)} {record.checkout_source ? `(${record.checkout_source})` : ''}</p>
                <p>Scheduled room: {record.scheduled_room.code}</p>
              </div>
              {record.mismatch_reason ? (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Room mismatch reason: {record.mismatch_reason}
                </p>
              ) : null}
              {record.discrepancy_status === 'open' && canResolve ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <textarea
                    value={notes[record.id] ?? ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [record.id]: event.target.value }))}
                    maxLength={500}
                    rows={2}
                    aria-label="Resolution notes"
                    placeholder="Record the administrative resolution (at least 10 characters)."
                    className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={busyId === record.id}
                    disabled={(notes[record.id]?.trim().length ?? 0) < 10}
                    onClick={() => void resolve(record)}
                  >
                    Resolve discrepancy
                  </Button>
                </div>
              ) : record.discrepancy_resolution_notes ? (
                <p className="mt-3 text-xs text-ink-muted">
                  Resolved by {record.discrepancy_resolved_by ?? 'administrator'}: {record.discrepancy_resolution_notes}
                </p>
              ) : null}
              {record.events.length ? (
                <details className="mt-3 border-t border-line pt-2">
                  <summary className="cursor-pointer text-xs font-semibold">Audit events ({record.events.length})</summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                    {record.events.map((event) => (
                      <li key={event.id}>
                        {dateTime(event.occurred_at)} · {event.event_type.replaceAll('_', ' ')}
                        {event.actor ? ` by ${event.actor}` : ' · system'}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
