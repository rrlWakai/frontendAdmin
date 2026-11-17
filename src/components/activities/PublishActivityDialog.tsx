import { useEffect, useRef, useState } from 'react'
import { Megaphone, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/common/Button'
import type { Activity } from '@/types/activity'

interface PublishActivityDialogProps {
  activity: Activity
  onCancel: () => void
  onPublishOnly: () => Promise<void>
  onPublishWithAnnouncement: () => Promise<void>
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

export function PublishActivityDialog({
  activity,
  onCancel,
  onPublishOnly,
  onPublishWithAnnouncement,
}: PublishActivityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to publish the activity.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      aria-labelledby="publish-activity-title"
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
    >
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Campus · Publishing
          </p>
          <h2 id="publish-activity-title" className="mt-1 text-xl font-semibold">
            Publish activity
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {activity.title} · {formatDate(activity.starts_at)}
          </p>
        </div>

        <p className="text-sm leading-6 text-ink">
          Publishing makes this activity visible to its intended audience. An announcement is
          optional. If you choose one, activity publication is recorded first, then the draft is
          created and published as a separate step. Progress stays visible below.
        </p>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="space-y-2 border-t border-line pt-4">
          <Button
            type="button"
            leftIcon={<Megaphone className="size-4" aria-hidden="true" />}
            isLoading={busy}
            disabled={busy}
            className="w-full justify-center"
            onClick={() => void run(onPublishWithAnnouncement)}
          >
            Publish and prepare announcement
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            isLoading={busy}
            disabled={busy}
            className="w-full justify-center"
            onClick={() => void run(onPublishOnly)}
          >
            Publish activity only
          </Button>
          <Button type="button" variant="ghost" disabled={busy} className="w-full justify-center" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
          <Send className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Activity updates never publish announcements or notify recipients automatically.
        </p>
      </div>
    </dialog>
  )
}
