import type { LucideIcon } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'

interface ModulePlaceholderProps {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  planned: string[]
}

export function ModulePlaceholder({
  icon,
  eyebrow,
  title,
  description,
  planned,
}: ModulePlaceholderProps) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Badge tone="info">Foundation ready</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <EmptyState
            icon={icon}
            title="This module is scaffolded"
            description="The route, layout, and shared interface are in place. Records and workflows will be enabled after the academic schema and authentication phases are approved."
          />
        </Card>

        <Card>
          <CardHeader>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Planned capabilities
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-ink">
              Scope for this module
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {planned.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-ink-muted">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-brand-500"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
