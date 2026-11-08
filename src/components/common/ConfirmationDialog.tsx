import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardHeader } from '@/components/common/Card'

type DialogVariant = 'confirm' | 'prompt'

interface ConfirmationDialogProps {
  onClose: () => void
  variant?: DialogVariant
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isLoading?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputValue?: string
  onConfirm: (value: string) => void | Promise<void>
}

export function ConfirmationDialog({
  onClose,
  variant = 'confirm',
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  onConfirm,
}: ConfirmationDialogProps) {
  const [input, setInput] = useState(inputValue ?? '')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleConfirm = () => {
    void onConfirm(input)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
    if (event.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        onClick={onClose}
      />
      <Card
        className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-white shadow-[0_18px_50px_-42px_rgba(23,23,23,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="flex items-start justify-between gap-3 pb-4">
          <div>
            <h2 id="confirmation-dialog-title" className="text-base font-bold text-ink">
              {title}
            </h2>
            {description ? (
              <p id="confirmation-dialog-description" className="mt-1 text-sm leading-6 text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isLoading}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </CardHeader>

        <div className="p-5 pb-3">
          {variant === 'prompt' && inputLabel ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">{inputLabel}</label>
              <input
                ref={inputRef}
                id="confirmation-dialog-input"
                autoFocus
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={inputPlaceholder}
                onKeyDown={handleKeyDown}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20"
                disabled={isLoading}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4 px-5 pb-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            isLoading={isLoading}
            onClick={handleConfirm}
            onKeyDown={handleKeyDown}
            disabled={isLoading || (variant === 'prompt' && !input.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </>
  )
}
