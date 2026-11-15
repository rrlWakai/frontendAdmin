import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface FacultyQuotaDialogProps {
  professorName: string
  quota: number | null
  onCancel: () => void
  onSubmit: (quota: number | null) => Promise<void>
}

function parseQuota(value: string): number | null | undefined {
  const trimmed = value.trim()

  if (trimmed === '') return null
  if (!/^\d+(?:\.\d)?$/.test(trimmed)) return undefined

  const quota = Number(trimmed)

  if (!Number.isFinite(quota) || quota < 0 || quota > 999.9) return undefined

  return quota
}

export function FacultyQuotaDialog({
  professorName,
  quota,
  onCancel,
  onSubmit,
}: FacultyQuotaDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState(quota === null ? '' : String(quota))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldError(undefined)

    const parsed = parseQuota(value)

    if (parsed === undefined) {
      setFieldError('Enter a non-negative value with at most one decimal place (maximum 999.9).')
      return
    }

    setIsSaving(true)

    try {
      await onSubmit(parsed)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to save the weekly teaching-hour quota.'))
      setFieldError(getApiFieldErrors(failure).weekly_teaching_hours_quota?.[0])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        if (!isSaving) onCancel()
      }}
      className="fixed inset-0 m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="faculty-quota-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Faculty workload
          </p>
          <h2 id="faculty-quota-title" className="mt-1 text-xl font-semibold">
            Weekly teaching-hour quota
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {professorName} · Set the maximum approved teaching hours per week.
          </p>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <TextField
          label="Approved weekly quota"
          name="weekly_teaching_hours_quota"
          type="number"
          min={0}
          max={999.9}
          step={0.1}
          inputMode="decimal"
          value={value}
          disabled={isSaving}
          error={fieldError}
          hint="Leave blank to mark the quota as not configured. Enter 0 for a configured zero-hour quota."
          onChange={(event) => {
            setValue(event.target.value)
            setFieldError(undefined)
            setError(null)
          }}
        />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save quota
          </Button>
        </div>
      </form>
    </dialog>
  )
}
