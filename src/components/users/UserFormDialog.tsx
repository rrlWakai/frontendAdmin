import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'
import type {
  AccountFormSubmission,
  ManagedRole,
  ManagedUser,
  ProgramOption,
  RoleOption,
} from '@/types/users'

interface UserFormDialogProps {
  user: ManagedUser | null
  roles: RoleOption[]
  programs: ProgramOption[]
  defaultRole?: ManagedRole
  lockRole?: boolean
  onCancel: () => void
  onSubmit: (input: AccountFormSubmission) => Promise<void>
}

interface FormValues {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: ManagedRole | ''
  student_number: string
  employee_number: string
  program_id: string
  admitted_on: string
  employment_type: 'full_time' | 'part_time' | 'visiting'
  specialization: string
}

function initialValues(user: ManagedUser | null, defaultRole?: ManagedRole): FormValues {
  const profile = user?.profile

  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    password_confirmation: '',
    role: user?.role.code ?? defaultRole ?? '',
    student_number: profile?.type === 'student' ? profile.student_number : '',
    employee_number: profile?.type === 'professor' ? profile.employee_number : '',
    program_id: profile?.program ? String(profile.program.id) : '',
    admitted_on: profile?.type === 'student' ? (profile.admitted_on ?? '') : '',
    employment_type: profile?.type === 'professor' ? profile.employment_type : 'full_time',
    specialization: profile?.type === 'professor' ? (profile.specialization ?? '') : '',
  }
}

function firstError(errors: Record<string, string[]>, field: string): string | undefined {
  return errors[field]?.[0]
}

export function UserFormDialog({
  user,
  roles,
  programs,
  defaultRole,
  lockRole = false,
  onCancel,
  onSubmit,
}: UserFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState(() => initialValues(user, defaultRole))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const isEditing = user !== null
  const availablePrograms = programs.filter(
    (program) => program.status === 'active' || program.id === user?.profile?.program?.id,
  )
  const activeProgramCount = programs.filter((program) => program.status === 'active').length

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    return () => dialog?.close()
  }, [])

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    const errorField = ['student_number', 'employee_number', 'program_id', 'admitted_on',
      'employment_type', 'specialization'].includes(field)
      ? `profile.${field}`
      : field
    setFieldErrors((current) => ({ ...current, [errorField]: [] }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    const profile =
      values.role === 'student'
        ? {
            student_number: values.student_number.trim(),
            program_id: values.program_id ? Number(values.program_id) : null,
            admitted_on: values.admitted_on || null,
          }
        : values.role === 'professor'
          ? {
              employee_number: values.employee_number.trim(),
              program_id: values.program_id ? Number(values.program_id) : null,
              employment_type: values.employment_type,
              specialization: values.specialization.trim() || null,
            }
          : undefined

    const submission: AccountFormSubmission = {
      name: values.name.trim(),
      email: values.email.trim(),
      ...(values.password
        ? {
            password: values.password,
            password_confirmation: values.password_confirmation,
          }
        : {}),
      ...(!isEditing ? { role: values.role || undefined } : {}),
      ...(profile ? { profile } : {}),
    }

    try {
      await onSubmit(submission)
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Unable to save this account.'))
      setFieldErrors(getApiFieldErrors(submitError))
    } finally {
      setIsSaving(false)
    }
  }

  const selectedRole = values.role

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night-950/45"
      aria-labelledby="account-dialog-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              User and access
            </p>
            <h2 id="account-dialog-title" className="mt-1 text-xl font-semibold">
              {isEditing ? 'Edit account' : 'Create account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-ink-muted hover:bg-brand-50 hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Full name"
            name="name"
            autoComplete="name"
            required
            value={values.name}
            error={firstError(fieldErrors, 'name')}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            error={firstError(fieldErrors, 'email')}
            onChange={(event) => updateField('email', event.target.value)}
          />

          {!isEditing && lockRole ? (
            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-ink">Account role</span>
              <p className="mt-1 rounded-lg border border-line bg-stone-50 px-3 py-2.5 text-sm text-ink-muted">
                {roles.find((role) => role.code === values.role)?.name ?? 'Student'}
              </p>
            </div>
          ) : !isEditing ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="account-role" className="block text-sm font-medium text-ink">
                Account role
              </label>
              <select
                id="account-role"
                required
                value={values.role}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    role: event.target.value as ManagedRole,
                    student_number: '',
                    employee_number: '',
                    program_id: '',
                    admitted_on: '',
                    employment_type: 'full_time',
                    specialization: '',
                  }))
                  setFieldErrors({})
                  setError(null)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="" disabled>
                  Select a role
                </option>
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
              {firstError(fieldErrors, 'role') ? (
                <p className="text-xs font-medium text-red-600">{firstError(fieldErrors, 'role')}</p>
              ) : null}
            </div>
          ) : (
            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-ink">Account role</span>
              <p className="mt-1 rounded-lg border border-line bg-stone-50 px-3 py-2.5 text-sm text-ink-muted">
                {user.role.name} · role assignments cannot be changed after account creation
              </p>
            </div>
          )}

          {!isEditing ? (
            <>
              <TextField
                label="Temporary password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={values.password}
                error={firstError(fieldErrors, 'password')}
                hint="Use at least 12 characters."
                onChange={(event) => updateField('password', event.target.value)}
              />
              <TextField
                label="Confirm password"
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={values.password_confirmation}
                onChange={(event) =>
                  updateField('password_confirmation', event.target.value)
                }
              />
            </>
          ) : (
            <>
              <TextField
                label="New password (optional)"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={values.password}
                error={firstError(fieldErrors, 'password')}
                hint="Leave blank to keep the current password."
                onChange={(event) => updateField('password', event.target.value)}
              />
              {values.password ? (
                <TextField
                  label="Confirm new password"
                  name="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={values.password_confirmation}
                  onChange={(event) =>
                    updateField('password_confirmation', event.target.value)
                  }
                />
              ) : null}
            </>
          )}

          {selectedRole === 'student' ? (
            <>
              {activeProgramCount === 0 ? (
                <p
                  role="alert"
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2"
                >
                  An active academic program is required before a Student account can be created.
                </p>
              ) : null}
              <TextField
                label="Student number"
                name="student_number"
                required
                maxLength={32}
                value={values.student_number}
                error={firstError(fieldErrors, 'profile.student_number')}
                onChange={(event) => updateField('student_number', event.target.value)}
              />
              <div className="space-y-1.5">
                <label htmlFor="account-program" className="block text-sm font-medium text-ink">
                  Academic program
                </label>
                <select
                  id="account-program"
                  required
                  value={values.program_id}
                  onChange={(event) => updateField('program_id', event.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="" disabled>
                    Select a program
                  </option>
                  {availablePrograms.map((program) => (
                    <option
                      key={program.id}
                      value={program.id}
                      disabled={
                        program.status !== 'active' &&
                        program.id !== user?.profile?.program?.id
                      }
                    >
                      {program.code} · {program.name}
                    </option>
                  ))}
                </select>
                {firstError(fieldErrors, 'profile.program_id') ? (
                  <p className="text-xs font-medium text-red-600">
                    {firstError(fieldErrors, 'profile.program_id')}
                  </p>
                ) : null}
              </div>
              <TextField
                label="Admission date"
                name="admitted_on"
                type="date"
                value={values.admitted_on}
                error={firstError(fieldErrors, 'profile.admitted_on')}
                onChange={(event) => updateField('admitted_on', event.target.value)}
              />
            </>
          ) : null}

          {selectedRole === 'professor' ? (
            <>
              <TextField
                label="Employee number"
                name="employee_number"
                maxLength={32}
                value={values.employee_number}
                error={firstError(fieldErrors, 'profile.employee_number')}
                hint="Required before a pending professor registration can be approved."
                onChange={(event) => updateField('employee_number', event.target.value)}
              />
              <div className="space-y-1.5">
                <label htmlFor="employment-type" className="block text-sm font-medium text-ink">
                  Employment type
                </label>
                <select
                  id="employment-type"
                  required
                  value={values.employment_type}
                  onChange={(event) =>
                    updateField(
                      'employment_type',
                      event.target.value as FormValues['employment_type'],
                    )
                  }
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="" disabled>
                    Select employment type
                  </option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="visiting">Visiting</option>
                </select>
                {firstError(fieldErrors, 'profile.employment_type') ? (
                  <p className="text-xs font-medium text-red-600">
                    {firstError(fieldErrors, 'profile.employment_type')}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="professor-program" className="block text-sm font-medium text-ink">
                  Academic program
                </label>
                <select
                  id="professor-program"
                  value={values.program_id}
                  onChange={(event) => updateField('program_id', event.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">No primary program</option>
                  {availablePrograms.map((program) => (
                    <option
                      key={program.id}
                      value={program.id}
                      disabled={
                        program.status !== 'active' &&
                        program.id !== user?.profile?.program?.id
                      }
                    >
                      {program.code} · {program.name}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label="Specialization"
                name="specialization"
                maxLength={160}
                value={values.specialization}
                error={firstError(fieldErrors, 'profile.specialization')}
                onChange={(event) => updateField('specialization', event.target.value)}
              />
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={selectedRole === 'student' && activeProgramCount === 0}
          >
            {isEditing ? 'Save changes' : 'Create account'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
