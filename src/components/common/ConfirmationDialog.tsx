import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'

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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const inputId = useId()
  const cancelId = useId()
  const confirmId = useId()
  const [input, setInput] = useState(inputValue ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    const frame = window.requestAnimationFrame(() => {
      if (variant === 'prompt' && inputLabel) inputRef.current?.focus()
      else if (destructive) document.getElementById(cancelId)?.focus()
      else document.getElementById(confirmId)?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      dialog?.close()
    }
  }, [cancelId, confirmId, destructive, inputLabel, variant])

  function handleClose() {
    if (!isLoading) onClose()
  }

  function handleConfirm() {
    if (isLoading) return
    if (variant === 'prompt' && !input.trim()) return
    void onConfirm(input)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !isLoading) {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-maroon-900/40"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {variant === 'prompt' && inputLabel ? (
          <div className="space-y-1.5 px-5 py-4">
            <label htmlFor={inputId} className="block text-sm font-medium text-ink">
              {inputLabel}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={inputPlaceholder}
              onKeyDown={handleInputKeyDown}
              disabled={isLoading}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/60 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 disabled:bg-stone-50"
            />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-line bg-stone-50/70 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            id={cancelId}
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            id={confirmId}
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            isLoading={isLoading}
            onClick={handleConfirm}
            disabled={isLoading || (variant === 'prompt' && !input.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
