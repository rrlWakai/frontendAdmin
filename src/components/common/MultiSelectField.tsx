import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MenuPosition {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
}

interface MultiSelectFieldProps {
  label: string
  values: string[]
  options: MultiSelectOption[]
  onChange: (values: string[]) => void
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  id?: string
  className?: string
}

export function MultiSelectField({
  label,
  values,
  options,
  onChange,
  placeholder = 'Select options',
  error,
  hint,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search options',
  id,
  className,
}: MultiSelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listboxId = `${fieldId}-listbox`
  const messageId = `${fieldId}-message`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleOptions = searchable && normalizedSearch
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
    : options
  const selectedOptions = options.filter((option) => values.includes(option.value))
  const summary = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} selected`

  function optionId(index: number): string {
    return `${fieldId}-option-${index}`
  }

  function updateMenuPosition() {
    const trigger = triggerRef.current

    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const width = Math.min(
      Math.max(rect.width, 208),
      Math.max(208, viewportWidth - 16),
    )
    const spaceBelow = viewportHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openAbove = spaceBelow < 176 && spaceAbove > spaceBelow
    const left = Math.min(Math.max(8, rect.left), viewportWidth - width - 8)
    const maxHeight = Math.max(96, Math.min(288, openAbove ? spaceAbove - 6 : spaceBelow - 6))

    setMenuPosition(openAbove
      ? {
          bottom: viewportHeight - rect.top + 6,
          left,
          width,
          maxHeight,
        }
      : {
          top: rect.bottom + 6,
          left,
          width,
          maxHeight,
        })
  }

  function nextEnabledIndex(list: MultiSelectOption[], start: number, direction: 1 | -1): number {
    if (list.length === 0) return -1

    let index = start
    for (let step = 0; step < list.length; step += 1) {
      index = (index + direction + list.length) % list.length
      if (!list[index].disabled) return index
    }

    return -1
  }

  function openMenu() {
    if (disabled) return

    setIsOpen(true)
    setSearchQuery('')
    setActiveIndex(nextEnabledIndex(options, -1, 1))
  }

  function closeMenu(focusTrigger = false) {
    setIsOpen(false)
    setActiveIndex(-1)
    setSearchQuery('')
    if (focusTrigger) triggerRef.current?.focus()
  }

  function toggleOption(option: MultiSelectOption) {
    if (option.disabled) return

    const next = values.includes(option.value)
      ? values.filter((value) => value !== option.value)
      : [...values, option.value]
    onChange(next)
  }

  function moveActive(direction: 1 | -1) {
    setActiveIndex((current) => nextEnabledIndex(visibleOptions, current, direction))
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) openMenu()
        else moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) openMenu()
        else moveActive(-1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (isOpen && activeIndex >= 0) {
          const option = visibleOptions[activeIndex]
          if (option) toggleOption(option)
        } else {
          openMenu()
        }
        break
      case 'Home':
        if (isOpen) {
          event.preventDefault()
          setActiveIndex(nextEnabledIndex(visibleOptions, -1, 1))
        }
        break
      case 'End':
        if (isOpen) {
          event.preventDefault()
          setActiveIndex(nextEnabledIndex(visibleOptions, visibleOptions.length, -1))
        }
        break
      case 'Escape':
        if (isOpen) {
          event.preventDefault()
          closeMenu(true)
        }
        break
      case 'Tab':
        if (isOpen) closeMenu()
        break
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(-1)
        break
      case 'Enter': {
        event.preventDefault()
        const option = visibleOptions[activeIndex]
        if (option) toggleOption(option)
        break
      }
      case 'Escape':
        event.preventDefault()
        closeMenu(true)
        break
      case 'Tab':
        closeMenu()
        break
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen || activeIndex < 0) return

    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (isOpen && searchable) searchRef.current?.focus()
  }, [isOpen, searchable])

  useEffect(() => {
    if (!isOpen) return
    setActiveIndex(nextEnabledIndex(visibleOptions, -1, 1))
  }, [normalizedSearch])

  useEffect(() => {
    if (disabled) closeMenu()
  }, [disabled])

  const hasMessage = Boolean(error || hint)
  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
        top: menuPosition.top,
        bottom: menuPosition.bottom,
        left: menuPosition.left,
        width: menuPosition.width,
        maxHeight: menuPosition.maxHeight,
      }
    : undefined

  return (
    <div ref={rootRef} className={cn('space-y-1.5', className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && menuPosition && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={hasMessage ? messageId : undefined}
        disabled={disabled}
        onClick={() => {
          if (isOpen) closeMenu()
          else openMenu()
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 text-left text-sm text-ink shadow-sm transition hover:border-stone-300 hover:bg-stone-50/40 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-muted/70',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          isOpen && !error && 'border-maroon-500 bg-white ring-2 ring-maroon-500/15',
        )}
      >
        <span className={cn('min-w-0 truncate', selectedOptions.length === 0 && 'text-ink-muted/80')}>
          {summary}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-muted transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && menuPosition ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={fieldId}
          style={menuStyle}
          className="fixed z-[70] overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[0_18px_40px_-24px_rgba(23,23,23,0.55)]"
        >
          {searchable ? (
            <div className="sticky top-0 z-10 border-b border-line bg-white px-2.5 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-9 w-full rounded-lg border border-line bg-stone-50 pl-8 pr-2.5 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/75 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon-500/15"
                />
              </div>
            </div>
          ) : null}
          {visibleOptions.length ? visibleOptions.map((option, index) => {
            const isSelected = values.includes(option.value)
            const isActive = index === activeIndex

            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index)
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggleOption(option)}
                className={cn(
                  'mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  option.disabled && 'cursor-not-allowed text-ink-muted/50',
                  !option.disabled && isActive && 'bg-maroon-50 text-maroon-900',
                  !option.disabled && !isActive && 'text-ink hover:bg-stone-50',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border',
                    isSelected ? 'border-maroon-600 bg-maroon-600 text-white' : 'border-stone-300 bg-white',
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 truncate">{option.label}</span>
              </div>
            )
          }) : (
            <p className="px-3 py-2 text-sm text-ink-muted">
              {normalizedSearch ? 'No matching options.' : 'No options available.'}
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p id={messageId} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
