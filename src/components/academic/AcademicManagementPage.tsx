import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import { useAuth } from '@/hooks/useAuth'
import {
  createAcademicRecord,
  fetchAcademicDirectory,
  fetchAcademicOptions,
  updateAcademicRecord,
} from '@/services/api/academic'
import type {
  AcademicOptions,
  AcademicPagination,
  AcademicRecord,
  AcademicResource,
} from '@/types/academic'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface SelectOption {
  value: string
  label: string
}

export interface AcademicFormField<T extends AcademicRecord> {
  name: keyof T & string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  required?: boolean
  min?: number
  max?: number
  step?: number
  maxLength?: number
  defaultValue?: string
  options?: (choices: AcademicOptions) => SelectOption[]
}

export interface AcademicFilter {
  key: 'program_id' | 'year_level_id' | 'academic_term_id'
  label: string
  options: (choices: AcademicOptions) => SelectOption[]
}

interface AcademicColumn<T extends AcademicRecord> {
  label: string
  render: (record: T) => ReactNode
}

export interface AcademicPageConfig<T extends AcademicRecord> {
  resource: AcademicResource
  title: string
  description: string
  singular: string
  searchPlaceholder: string
  fields: AcademicFormField<T>[]
  columns: AcademicColumn<T>[]
  statusOptions?: SelectOption[]
  filters?: AcademicFilter[]
  showSearch?: boolean
  emptyDescription: string
}

type FormValues = Record<string, string>
type AcademicPayload = Record<string, string | number | boolean | null>

function valueAsText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function makePayload<T extends AcademicRecord>(
  fields: AcademicFormField<T>[],
  values: FormValues,
): AcademicPayload {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values[field.name] ?? ''

      if (field.type === 'checkbox') {
        return [field.name, value === 'true']
      }

      if (value === '' && !field.required) {
        return [field.name, null]
      }

      if (field.type === 'number') {
        return [field.name, Number(value)]
      }

      return [field.name, value]
    }),
  )
}

function firstFieldError(errors: Record<string, string[]>, field: string): string | undefined {
  return errors[field]?.[0]
}

interface AcademicRecordDialogProps<T extends AcademicRecord> {
  record: T | null
  config: AcademicPageConfig<T>
  options: AcademicOptions
  onCancel: () => void
  onSubmit: (payload: AcademicPayload) => Promise<void>
}

function AcademicRecordDialog<T extends AcademicRecord>({
  record,
  config,
  options,
  onCancel,
  onSubmit,
}: AcademicRecordDialogProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        valueAsText(
          record
            ? record[field.name]
            : field.type === 'checkbox'
              ? false
              : (field.defaultValue ?? ''),
        ),
      ]),
    ),
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit(makePayload(config.fields, values))
    } catch (submitFailure) {
      const errors = getApiFieldErrors(submitFailure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0] ??
          getApiErrorMessage(submitFailure, `Unable to save ${config.singular.toLowerCase()}.`),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="academic-record-dialog-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Academic structure
            </p>
            <h2 id="academic-record-dialog-title" className="mt-1 text-xl font-semibold">
              {record ? `Edit ${config.singular.toLowerCase()}` : `Create ${config.singular.toLowerCase()}`}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((field) => {
            const fieldId = `academic-${field.name}`
            const fieldError = firstFieldError(fieldErrors, field.name)
            const value = values[field.name] ?? ''

            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className="flex items-center gap-3 text-sm font-medium text-ink sm:col-span-2">
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={value === 'true'}
                    aria-invalid={Boolean(fieldError)}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        [field.name]: String(event.target.checked),
                        ...(field.name === 'is_current' && event.target.checked
                          ? { status: 'active' }
                          : {}),
                      }))
                      setFieldErrors((current) => ({ ...current, [field.name]: [] }))
                      setError(null)
                    }}
                    className="size-4 rounded border-line text-brand-700 focus:ring-brand-500"
                  />
                  {field.label}
                  {fieldError ? <span className="text-xs text-red-600">{fieldError}</span> : null}
                </label>
              )
            }

            return (
              <div key={field.name} className={`space-y-1.5 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                {field.type === 'text' || field.type === 'number' || field.type === 'date' ? (
                  <TextField
                    id={fieldId}
                    label={field.label}
                    type={field.type}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    maxLength={field.maxLength}
                    value={value}
                    error={fieldError}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      setFieldErrors((current) => ({ ...current, [field.name]: [] }))
                      setError(null)
                    }}
                  />
                ) : field.type === 'select' ? (
                  <>
                    <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
                      {field.label}
                    </label>
                  <select
                    id={fieldId}
                    required={field.required}
                    value={value}
                    aria-invalid={Boolean(fieldError)}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      setFieldErrors((current) => ({ ...current, [field.name]: [] }))
                      setError(null)
                    }}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(field.options?.(options) ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  </>
                ) : (
                  <>
                    <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
                      {field.label}
                    </label>
                  <textarea
                    id={fieldId}
                    required={field.required}
                    maxLength={field.maxLength}
                    value={value}
                    aria-invalid={Boolean(fieldError)}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      setFieldErrors((current) => ({ ...current, [field.name]: [] }))
                      setError(null)
                    }}
                    className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  </>
                )}
                {fieldError && (field.type === 'select' || field.type === 'textarea') ? (
                  <p className="text-xs font-medium text-red-600">{fieldError}</p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save {config.singular.toLowerCase()}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

interface AcademicManagementPageProps<T extends AcademicRecord> {
  config: AcademicPageConfig<T>
}

export function AcademicManagementPage<T extends AcademicRecord>({
  config,
}: AcademicManagementPageProps<T>) {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [records, setRecords] = useState<T[]>([])
  const [pagination, setPagination] = useState<AcademicPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [options, setOptions] = useState<AcademicOptions | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [loadError, setLoadError] = useState<{ requestKey: string; message: string } | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogRecord, setDialogRecord] = useState<T | null | undefined>()
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [optionsVersion, setOptionsVersion] = useState(0)

  useEffect(() => {
    let active = true
    void fetchAcademicOptions()
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load academic options.'))
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false)
      })
    return () => {
      active = false
    }
  }, [optionsVersion])

  const requestKey = JSON.stringify([
    config.resource,
    search,
    status,
    filters,
    page,
    refreshVersion,
  ])
  const isLoading = settledRequestKey !== requestKey
  const error = loadError?.requestKey === requestKey ? loadError.message : null

  useEffect(() => {
    let active = true
    void fetchAcademicDirectory<T>(config.resource, {
      search: search || undefined,
      status: status || undefined,
      ...Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [key, value ? Number(value) : undefined]),
      ),
      page,
      per_page: 25,
    })
      .then((result) => {
        if (active) {
          setRecords(result.records)
          setPagination(result.pagination)
          setSettledRequestKey(requestKey)
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setLoadError({
            requestKey,
            message: getApiErrorMessage(failure, `Unable to load ${config.title.toLowerCase()}.`),
          })
          setSettledRequestKey(requestKey)
        }
      })
    return () => {
      active = false
    }
  }, [config.resource, config.title, filters, page, refreshVersion, requestKey, search, status])

  async function saveRecord(payload: AcademicPayload) {
    if (dialogRecord) {
      await updateAcademicRecord(config.resource, dialogRecord.id, payload)
      setSuccess(`${config.singular} changes saved.`)
    } else {
      await createAcademicRecord(config.resource, payload)
      setSuccess(`${config.singular} created.`)
      setPage(1)
    }
    setDialogRecord(undefined)
    setRefreshVersion((version) => version + 1)
  }

  const hasFilters = Boolean(search || status || Object.values(filters).some(Boolean))

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title={config.title}
        description={config.description}
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setSuccess(null)
                setDialogRecord(null)
              }}
              disabled={isLoadingOptions || Boolean(optionsError)}
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
            >
              Create {config.singular.toLowerCase()}
            </Button>
          ) : null
        }
      />

      {success ? (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <Check className="size-4" aria-hidden="true" />
          {success}
          <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{optionsError}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => {
            setOptionsError(null)
            setIsLoadingOptions(true)
            setOptionsVersion((version) => version + 1)
          }}>
            Retry options
          </Button>
        </div>
      ) : null}

      <Card>
        <CardBody>
          {config.showSearch !== false || config.statusOptions || config.filters ? (
            <form
              className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(1)
                setSearch(searchInput.trim())
                setSuccess(null)
              }}
            >
              {config.showSearch !== false ? (
                <TextField
                  label={`Search ${config.title.toLowerCase()}`}
                  name="search"
                  type="search"
                  value={searchInput}
                  placeholder={config.searchPlaceholder}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              ) : <div />}
              {config.statusOptions ? (
                <div className="space-y-1.5">
                  <label htmlFor={`${config.resource}-status-filter`} className="block text-sm font-medium text-ink">
                    Status
                  </label>
                  <select
                    id={`${config.resource}-status-filter`}
                    value={status}
                    onChange={(event) => {
                      setPage(1)
                      setStatus(event.target.value)
                    }}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">All statuses</option>
                    {config.statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              {config.filters?.map((filter) => (
                <div key={filter.key} className="space-y-1.5">
                  <label htmlFor={`${config.resource}-${filter.key}-filter`} className="block text-sm font-medium text-ink">
                    {filter.label}
                  </label>
                  <select
                    id={`${config.resource}-${filter.key}-filter`}
                    value={filters[filter.key] ?? ''}
                    onChange={(event) => {
                      setPage(1)
                      setFilters((current) => ({ ...current, [filter.key]: event.target.value }))
                    }}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">All {filter.label.toLowerCase()}</option>
                    {filter.options(options ?? {
                      programs: [],
                      year_levels: [],
                      terms: [],
                    }).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              {config.showSearch !== false ? (
                <div className="flex items-end">
                  <Button type="submit" variant="outline" className="w-full md:w-auto">
                    Search
                  </Button>
                </div>
              ) : null}
            </form>
          ) : null}

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading {config.title.toLowerCase()}…
            </div>
          ) : records.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={BookOpen}
                title={`No ${config.title.toLowerCase()} found`}
                description={hasFilters ? 'Try adjusting the search or filters.' : config.emptyDescription}
                action={
                  canManage ? (
                    <Button onClick={() => setDialogRecord(null)} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
                      Create {config.singular.toLowerCase()}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      {config.columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}
                      {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {records.map((record) => (
                      <tr key={record.id} className="align-top">
                        {config.columns.map((column) => (
                          <td key={column.label} className="px-4 py-4 text-ink-muted">
                            {column.render(record)}
                          </td>
                        ))}
                        {canManage ? (
                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSuccess(null)
                                  setDialogRecord(record)
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  {pagination.total} record{pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={page >= pagination.last_page} onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}>
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {dialogRecord !== undefined && options ? (
        <AcademicRecordDialog
          key={dialogRecord?.id ?? 'new'}
          record={dialogRecord}
          config={config}
          options={options}
          onCancel={() => setDialogRecord(undefined)}
          onSubmit={saveRecord}
        />
      ) : null}
    </>
  )
}
