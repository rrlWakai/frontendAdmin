import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import type { ManagedUser, ProgramOption } from '@/types/users'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface DepartmentPersonnelProgramAccessDialogProps {
  user: ManagedUser
  programs: ProgramOption[]
  onCancel: () => void
  onSubmit: (programIds: number[]) => Promise<void>
}

export function DepartmentPersonnelProgramAccessDialog({
  user,
  programs,
  onCancel,
  onSubmit,
}: DepartmentPersonnelProgramAccessDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(
      user.program_access
        .filter((program) => program.status === 'active')
        .map((program) => program.id),
    ),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    return () => dialog?.close()
  }, [])

  function toggleProgram(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      await onSubmit([...selectedIds].sort((a, b) => a - b))
    } catch (submitError) {
      setError(
        getApiFieldErrors(submitError).program_ids?.[0] ??
          getApiErrorMessage(submitError, 'Unable to update program access.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night-950/45"
      aria-labelledby="program-access-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Attendance access
          </p>
          <h2 id="program-access-title" className="mt-1 text-xl font-semibold">
            Programs for {user.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            This account can monitor attendance only for assigned programs. No selected
            programs means no Attendance monitoring access.
          </p>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-ink">Academic programs</legend>
          {programs.length === 0 ? (
            <p className="rounded-lg border border-line bg-stone-50 p-4 text-sm text-ink-muted">
              No programs are available to assign.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
              {programs.map((program) => (
                <label key={program.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(program.id)}
                    disabled={program.status !== 'active'}
                    onChange={() => toggleProgram(program.id)}
                    className="mt-1 size-4 rounded border-line text-brand-700 focus:ring-brand-500"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-ink">{program.code}</span>
                    <span className="ml-2 text-ink-muted">{program.name}</span>
                    {program.status !== 'active' ? (
                      <span className="ml-2 text-xs text-amber-700">Inactive</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save access
          </Button>
        </div>
      </form>
    </dialog>
  )
}
