import { AttendancePolicyManagement } from '@/components/attendance/AttendancePolicyManagement'
import { Card, CardBody } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/hooks/useAuth'

export function AttendancePage() {
  const { user } = useAuth()
  const canManagePolicies = user?.role === 'administrator'

  return (
    <>
      <PageHeader
        eyebrow="Academic operations"
        title="Attendance Policy"
        description="Manage versioned absence allowance policies by academic term, including offering-specific overrides."
      />

      {canManagePolicies ? (
        <AttendancePolicyManagement />
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-muted">
              Attendance policy management is restricted to administrators. Contact an
              administrator to change absence allowance policies.
            </p>
          </CardBody>
        </Card>
      )}
    </>
  )
}
