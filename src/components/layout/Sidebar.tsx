import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Library,
  Megaphone,
  Sparkles,
  TriangleAlert,
  Users,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/utils/cn'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

const navigation: NavigationGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'People',
    items: [
      { label: 'Users', to: '/users', icon: Users },
      { label: 'Faculty', to: '/faculty', icon: GraduationCap },
      { label: 'Students', to: '/students', icon: UserRound },
    ],
  },
  {
    label: 'Academics',
    items: [
      { label: 'Programs', to: '/academic', icon: BookOpen, end: true },
      { label: 'Terms', to: '/academic/terms', icon: CalendarRange },
      { label: 'Year levels', to: '/academic/year-levels', icon: Layers },
      { label: 'Subjects', to: '/subjects', icon: Library },
      { label: 'Sections', to: '/academic/sections', icon: UsersRound },
      { label: 'Subject offerings', to: '/academic/subject-offerings', icon: BookOpenCheck },
      { label: 'Rooms', to: '/rooms', icon: DoorOpen },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Scheduling', to: '/scheduling', icon: CalendarDays },
      { label: 'Student conflicts', to: '/student-schedule-conflicts', icon: TriangleAlert },
      { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
      { label: 'Announcements', to: '/announcements', icon: Megaphone },
      { label: 'Activities', to: '/activities', icon: Sparkles },
    ],
  },
]

interface SidebarProps {
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col text-white" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="flex h-20 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Logo compact />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-tight text-white">
              CCSync Admin
            </p>
            <p className="mt-0.5 text-[9px] leading-none text-maroon-200/80">
              College of Computer Studies
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-maroon-100 transition hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="h-1 bg-maroon-500/20" />

      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2" aria-label="Primary">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-maroon-200/50">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-gold-500 text-maroon-900 shadow-sm'
                              : 'text-maroon-100/70 hover:bg-white/5 hover:text-white',
                          )
                        }
                      >
                        <Icon
                          className="size-[18px] shrink-0 text-current opacity-90"
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-200/40">
            CCSync Phase 3
          </p>
          <p className="mt-1.5 text-sm font-medium leading-5 text-white/85">
            Core Academic Management
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Stage 2: Academic Structure Management
          </p>
        </div>
      </div>
    </aside>
  )
}
