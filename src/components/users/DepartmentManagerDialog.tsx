import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import type { UserOptions } from '@/types/users'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface DepartmentManagerDialogProps {
  departments: UserOptions['departments']
  onClose: () => void
  onAdd: (input: { code: string; name: string }) => Promise<void>
}

export function DepartmentManagerDialog({
  departments,
  onClose,
  onAdd,
}: DepartmentManagerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    return () => dialog?.close()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSaving(true)

    try {
      await onAdd({ code: code.trim().toUpperCase(), name: name.trim() })
      setCode('')
      setName('')
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Unable to configure this department.'))
      setFieldErrors(getApiFieldErrors(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night-950/45"
      aria-labelledby="departments-dialog-title"
    >
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Account options
          </p>
          <h2 id="departments-dialog-title" className="mt-1 text-xl font-semibold">
            Departments
          </h2>
        </div>

        <ul className="max-h-44 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {departments.map((department) => (
            <li key={department.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span>{department.name}</span>
              <span className="text-xs text-ink-muted">{department.code}</span>
            </li>
          ))}
        </ul>

        <form className="space-y-3 border-t border-line pt-4" onSubmit={(event) => void submit(event)}>
          <p className="text-sm font-semibold">Add a department</p>
          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Department code"
              name="department-code"
              required
              maxLength={32}
              value={code}
              error={fieldErrors.code?.[0]}
              onChange={(event) => setCode(event.target.value)}
            />
            <TextField
              label="Department name"
              name="department-name"
              required
              maxLength={120}
              value={name}
              error={fieldErrors.name?.[0]}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
              Close
            </Button>
            <Button type="submit" isLoading={isSaving}>Add department</Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
