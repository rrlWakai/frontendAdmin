/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error'
type Item = { id: number; kind: Kind; message: string }
type Api = { success: (message: string) => void; error: (message: string) => void }
const FeedbackContext = createContext<Api | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const nextId = useRef(0)
  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), [])
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++nextId.current
    setItems((list) => [...list, { id, kind, message }])
    if (kind === 'success') window.setTimeout(() => dismiss(id), 5000)
  }, [dismiss])
  const api = useMemo<Api>(() => ({ success: (message) => push('success', message), error: (message) => push('error', message) }), [push])
  return <FeedbackContext.Provider value={api}>{children}<div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">{items.map((item) => <div key={item.id} role={item.kind === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${item.kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-green-200 bg-green-50 text-green-900'}`}><span>{item.message}</span><button type="button" aria-label="Dismiss message" onClick={() => dismiss(item.id)} className="font-medium">×</button></div>)}</div></FeedbackContext.Provider>
}
export function useFeedback(): Api { const context = useContext(FeedbackContext); if (!context) throw new Error('useFeedback must be used inside FeedbackProvider'); return context }
