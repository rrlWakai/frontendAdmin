import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/common/Button'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import {
  fetchRoomQr,
  fetchRoomQrHistory,
  regenerateRoomQr,
  revokeRoomQr,
} from '@/services/api/rooms'
import type { RoomQrHistoryEntry, RoomQrIdentity } from '@/types/room'
import { getApiErrorMessage } from '@/utils/apiError'

interface RoomQrManagementProps {
  roomId: number
  roomCode: string
  roomName: string
}

function escapeHtml(value: string): string {
  const escaped: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return value.replace(/[&<>"']/g, (character) => escaped[character] ?? character)
}

export function RoomQrManagement({ roomId, roomCode, roomName }: RoomQrManagementProps) {
  const [identity, setIdentity] = useState<RoomQrIdentity | null>(null)
  const [history, setHistory] = useState<RoomQrHistoryEntry[]>([])
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [current, previous] = await Promise.all([
        fetchRoomQr(roomId),
        fetchRoomQrHistory(roomId),
      ])
      setIdentity(current)
      setHistory(previous)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to load the room QR identity.'))
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    if (!identity) {
      setQrImage(null)
      return
    }

    void QRCode.toDataURL(identity.payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
      .then((image) => {
        if (active) setQrImage(image)
      })
      .catch(() => {
        if (active) setError('Unable to render this room QR code.')
      })

    return () => {
      active = false
    }
  }, [identity])

  async function createOrRotate() {
    setIsSaving(true)
    setError(null)
    try {
      const next = await regenerateRoomQr(roomId)
      setIdentity(next)
      setHistory(await fetchRoomQrHistory(roomId))
      setConfirmRegenerate(false)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to generate a room QR code.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function revoke() {
    if (revokeReason.trim().length < 10) return
    setIsSaving(true)
    setError(null)
    try {
      await revokeRoomQr(roomId, revokeReason.trim())
      setIdentity(null)
      setRevokeReason('')
      setHistory(await fetchRoomQrHistory(roomId))
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to revoke the room QR code.'))
    } finally {
      setIsSaving(false)
    }
  }

  function printQr() {
    if (!qrImage) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Allow pop-ups to print the room QR code.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
      <html><head><title>${escapeHtml(roomCode)} room QR</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:Arial,sans-serif;color:#142d37;text-align:center;padding:32px}
        main{max-width:520px;margin:0 auto;border:1px solid #d5dfe0;padding:24px}
        img{display:block;width:280px;height:280px;margin:18px auto}
        h1{font-size:24px;margin:0}p{margin:8px 0;color:#52666b}
        @media print{body{padding:0}main{border:0}}
      </style></head><body><main>
      <h1>${escapeHtml(roomName)}</h1><p>${escapeHtml(roomCode)}</p>
      <img alt="Permanent room QR code" src="${qrImage}">
      <p>Scan with ClassFlow to validate a scheduled room check-in.</p>
      </main></body></html>`)
    printWindow.document.close()
    const image = printWindow.document.querySelector('img')
    const print = () => {
      printWindow.focus()
      printWindow.print()
    }
    if (image?.complete) window.setTimeout(print, 100)
    else image?.addEventListener('load', print, { once: true })
  }

  return (
    <section className="space-y-4 rounded-xl border border-line p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
          Room identity
        </p>
        <h3 className="mt-1 text-lg font-semibold">Permanent room QR</h3>
        <p className="mt-1 text-sm text-ink-muted">
          This opaque room identifier is not a login credential. Only authenticated professors can check in.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => void load()}>Retry</button>
        </div>
      ) : null}

      {isLoading ? (
        <p role="status" className="text-sm text-ink-muted">Loading QR identity…</p>
      ) : identity ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {qrImage ? (
            <img className="size-44 border border-line bg-white p-2" src={qrImage} alt={`QR code for ${roomCode}`} />
          ) : <p role="status" className="text-sm text-ink-muted">Preparing QR code…</p>}
          <div className="space-y-2">
            <p className="text-sm font-medium">Active since {identity.created_at ? new Date(identity.created_at).toLocaleString() : 'unknown'}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!qrImage} onClick={printQr}>Print QR</Button>
              <Button size="sm" variant="outline" isLoading={isSaving} onClick={() => setConfirmRegenerate(true)}>
                Regenerate
              </Button>
            </div>
            <label className="block text-xs font-medium text-ink-muted" htmlFor={`qr-revoke-reason-${roomId}`}>
              Revocation reason
            </label>
            <textarea
              id={`qr-revoke-reason-${roomId}`}
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              placeholder="Explain why this printed QR must be invalidated."
            />
            <Button
              size="sm"
              variant="outline"
              isLoading={isSaving}
              disabled={revokeReason.trim().length < 10}
              onClick={() => void revoke()}
            >
              Revoke QR
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">No active QR identity is registered for this room.</p>
          <Button size="sm" isLoading={isSaving} onClick={() => void createOrRotate()}>Generate room QR</Button>
        </div>
      )}

      {history.length ? (
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold">QR identity history ({history.length})</summary>
          <ul className="mt-3 space-y-2 text-xs text-ink-muted">
            {history.map((item) => (
              <li key={item.id} className="border-l-2 border-line pl-3">
                <span className="font-medium text-ink">{item.revoked_at ? 'Revoked' : 'Active'}</span>
                {' · '}created {item.created_at ? new Date(item.created_at).toLocaleString() : 'unknown'}
                {item.created_by ? ` by ${item.created_by}` : ''}
                {item.revoked_at ? ` · revoked ${new Date(item.revoked_at).toLocaleString()}` : ''}
                {item.revoked_by ? ` by ${item.revoked_by}` : ''}
                {item.revocation_reason ? ` · ${item.revocation_reason}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {confirmRegenerate ? (
        <ConfirmationDialog
          title="Regenerate room QR?"
          description="The current printed QR will stop working immediately. Existing occupancy history will remain unchanged."
          confirmLabel="Regenerate QR"
          cancelLabel="Keep current QR"
          destructive={false}
          isLoading={isSaving}
          onClose={() => setConfirmRegenerate(false)}
          onConfirm={() => void createOrRotate()}
        />
      ) : null}
    </section>
  )
}
