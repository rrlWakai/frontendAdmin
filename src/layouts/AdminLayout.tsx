import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="min-h-svh bg-surface lg:grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 w-[280px]">
          <Sidebar />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-brand-950/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation overlay"
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-[min(88vw,320px)]"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Sidebar
                onNavigate={() => setMobileOpen(false)}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-svh min-w-0 flex-col lg:col-start-2">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mx-auto w-full max-w-7xl"
          >
            <Outlet />
          </motion.div>
        </main>

        <footer className="border-t border-line px-4 py-4 text-xs text-ink-muted md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p>CCSync · College of Computer Studies</p>
            <p>Phase 3 · Core Academic Management</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
