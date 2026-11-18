import { useId, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  Sparkles,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/utils/cn'

interface NavigationChild {
  label: string
  to: string
  end?: boolean
}

interface NavigationLink {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

interface NavigationParent {
  label: string
  icon: LucideIcon
  children: NavigationChild[]
}

type NavigationItem = NavigationLink | NavigationParent

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

function hasChildren(item: NavigationItem): item is NavigationParent {
  return 'children' in item
}

function isPathMatch(pathname: string, to: string, end?: boolean): boolean {
  return pathname === to || (!end && pathname.startsWith(`${to}/`))
}

function getBranchKey(item: NavigationParent, pathname: string): string {
  const activeChild = item.children.find((child) =>
    isPathMatch(pathname, child.to, child.end),
  )

  return `${item.label}-${activeChild?.to ?? 'inactive'}`
}

const academicChildren: NavigationChild[] = [
  { label: 'Programs', to: '/academic', end: true },
  { label: 'Majors', to: '/academic/majors' },
  { label: 'Curriculum', to: '/academic/curriculum' },
  { label: 'Academic Terms', to: '/academic/terms' },
  { label: 'Year Levels', to: '/academic/year-levels' },
  { label: 'Sections', to: '/academic/sections' },
]

const navigation: NavigationGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Schedule',
    items: [{ label: 'Schedule', to: '/scheduling', icon: CalendarDays }],
  },
  {
    label: 'Academic',
    items: [
      {
        label: 'Academic',
        icon: GraduationCap,
        children: academicChildren,
      },
      { label: 'Subjects', to: '/subjects', icon: Library },
      { label: 'Offerings', to: '/academic/subject-offerings', icon: BookOpenCheck },
      { label: 'Faculty', to: '/faculty', icon: GraduationCap },
      { label: 'Rooms', to: '/rooms', icon: DoorOpen },
    ],
  },
  {
    label: 'Campus',
    items: [{ label: 'Activities', to: '/activities', icon: Sparkles }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users & access', to: '/users', icon: Users },
      { label: 'Students', to: '/students', icon: UserRound },
    ],
  },
]

interface NavigationBranchProps {
  item: NavigationParent
  onNavigate?: () => void
}

function NavigationBranch({ item, onNavigate }: NavigationBranchProps) {
  const location = useLocation()
  const panelId = useId()
  const hasActiveChild = item.children.some((child) =>
    isPathMatch(location.pathname, child.to, child.end),
  )
  const [isOpen, setIsOpen] = useState(hasActiveChild)
  const Icon = item.icon

  return (
    <li>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70',
          hasActiveChild
            ? 'text-white'
            : 'text-maroon-100/70 hover:bg-white/5 hover:text-white',
        )}
      >
        <Icon
          className="size-[18px] shrink-0 text-current opacity-90"
          aria-hidden="true"
        />
        <span>{item.label}</span>
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <ul
        id={panelId}
        className={cn('mt-1 space-y-1', !isOpen && 'hidden')}
      >
        {item.children.map((child) => (
          <li key={child.to}>
            <NavLink
              to={child.to}
              end={child.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-xl py-2 pl-11 pr-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70',
                  isActive
                    ? 'bg-gold-500 text-maroon-900 shadow-sm'
                    : 'text-maroon-100/70 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {child.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  )
}

interface SidebarProps {
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const location = useLocation()

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
                  if (hasChildren(item)) {
                    return (
                      <NavigationBranch
                        key={getBranchKey(item, location.pathname)}
                        item={item}
                        onNavigate={onNavigate}
                      />
                    )
                  }

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
            CCSync
          </p>
          <p className="mt-1.5 text-sm font-medium leading-5 text-white/85">
            Intelligent Scheduling
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            College academic management
          </p>
        </div>
      </div>
    </aside>
  )
}
