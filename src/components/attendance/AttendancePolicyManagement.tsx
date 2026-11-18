import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { fetchAcademicOptions } from '@/services/api/academic'
import {
  createAttendancePolicy,
  fetchAttendancePolicies,
} from '@/services/api/attendance'
import type { AttendancePolicy } from '@/services/api/attendance'
import { fetchSubjectOfferings } from '@/services/api/subjectOfferings'
import type { SubjectOffering } from '@/types/subjectOffering'
import { getApiErrorMessage } from '@/utils/apiError'

interface AcademicTermOption {
  id: number
  academic_year: string
  name: string
  status: string
  is_current?: boolean
}

export function AttendancePolicyManagement() {
  const [terms, setTerms] = useState<AcademicTermOption[]>([])
  const [termId, setTermId] = useState<number | null>(null)
  const [offerings, setOfferings] = useState<SubjectOffering[]>([])
  const [policies, setPolicies] = useState<AttendancePolicy[]>([])
  const [offeringValue, setOfferingValue] = useState('')
  const [allowance, setAllowance] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true
    void fetchAcademicOptions()
      .then((options) => {
        if (!active) return
        const termOptions = options.terms
        setTerms(termOptions)
        setTermId(termOptions.find((term) => term.is_current)?.id ?? termOptions[0]?.id ?? null)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load academic terms.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (termId === null) return
    let active = true
    setLoading(true)
    setError(null)
    void Promise.all([
      fetchAttendancePolicies(termId),
      fetchSubjectOfferings({ academic_term_id: termId, per_page: 100 }),
    ])
      .then(([policyRows, offeringRows]) => {
        if (!active) return
        setPolicies(policyRows)
        setOfferings(offeringRows.offerings)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load attendance policies.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [termId, refreshVersion])

  const selectedTerm = useMemo(() => terms.find((term) => term.id === termId), [terms, termId])
  const termIsHistorical = selectedTerm !== undefined &&
    ['completed', 'archived'].includes(selectedTerm.status)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (termId === null || allowance === '') return
    setSaving(true)
    setError(null)
    try {
      await createAttendancePolicy({
        academic_term_id: termId,
        subject_offering_id: offeringValue ? Number(offeringValue) : null,
        allowed_absences: Number(allowance),
      })
      setAllowance('')
      setRefreshVersion((version) => version + 1)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to save the absence policy.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-5">
      <CardBody>
        <div>
          <h2 className="text-base font-semibold text-ink">Absence allowance policies</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Policies are versioned by academic term. An offering override takes precedence over the institutional default.
          </p>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-lg border border-line p-4">
            <label className="block space-y-1.5 text-sm font-medium text-ink">
              Academic term
              <select
                required
                value={termId ?? ''}
                onChange={(event) => {
                  setTermId(Number(event.target.value))
                  setOfferingValue('')
                }}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.academic_year} · {term.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-ink">
              Scope
              <select
                value={offeringValue}
                onChange={(event) => setOfferingValue(event.target.value)}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal"
              >
                <option value="">Institutional default</option>
                {offerings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.subject.code} · {offering.section.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-ink">
              Allowed absences
              <input
                required
                type="number"
                min="0"
                max="65535"
                step="1"
                value={allowance}
                onChange={(event) => setAllowance(event.target.value)}
                className="h-10 w-full rounded-lg border border-line px-3 text-sm font-normal"
                placeholder="Set the approved institutional value"
              />
            </label>
            <p className="text-xs text-ink-muted">
              {offeringValue ? 'This setting applies only to the selected offering.' : 'This setting is the fallback for offerings without an override.'}
            </p>
            {termIsHistorical ? (
              <p className="text-xs text-ink-muted">Completed term policies are preserved and cannot be changed retroactively.</p>
            ) : null}
            <Button type="submit" size="sm" isLoading={saving} disabled={termId === null || termIsHistorical}>
              Save new policy version
            </Button>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              {selectedTerm ? `${selectedTerm.academic_year} · ${selectedTerm.name}` : 'Policy history'}
            </h3>
            {loading ? (
              <p role="status" className="py-6 text-sm text-ink-muted">Loading policy versions…</p>
            ) : policies.length ? (
              <ul className="mt-2 divide-y divide-line">
                {policies.map((policy) => {
                  const offering = offerings.find((item) => item.id === policy.subject_offering_id)
                  const policyOffering = policy.subject_offering
                  const offeringLabel = policyOffering
                    ? [policyOffering.subject?.code, policyOffering.section?.code].filter(Boolean).join(' · ')
                    : offering
                      ? `${offering.subject.code} · ${offering.section.code}`
                      : null
                  const isOfferingPolicy = policy.subject_offering_id !== null

                  return (
                    <li key={policy.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <span className="text-ink">
                        {offeringLabel ?? 'Institutional default'}
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {isOfferingPolicy ? 'Offering override' : 'Institutional fallback'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-ink-muted">
                        <span className="block">
                          {policy.allowed_absences} absences · effective {new Date(policy.effective_at).toLocaleDateString()}
                        </span>
                        <span className="mt-0.5 block text-xs">
                          {policy.created_by?.name ? `Set by ${policy.created_by.name}` : 'System record'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No policy has been configured for this term.</p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
