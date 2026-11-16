import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
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

interface SelectFieldProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  hint,
  required = false,
  disabled = false,
  className,
  id,
  name,
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const listboxId = `${fieldId}-listbox`
  const messageId = `${fieldId}-message`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

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

  function nextEnabledIndex(start: number, direction: 1 | -1): number {
    if (options.length === 0) return -1

    let index = start
    for (let step = 0; step < options.length; step += 1) {
      index = (index + direction + options.length) % options.length
      if (!options[index].disabled) return index
    }

    return -1
  }

  function openMenu() {
    if (disabled) return

    setIsOpen(true)
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : nextEnabledIndex(-1, 1),
    )
  }

  function closeMenu(focusTrigger = false) {
    setIsOpen(false)
    setActiveIndex(-1)
    if (focusTrigger) triggerRef.current?.focus()
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) return

    onChange(option.value)
    closeMenu(true)
  }

  function moveActive(direction: 1 | -1) {
    setActiveIndex((current) => nextEnabledIndex(current, direction))
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
          const option = options[activeIndex]
          if (option) selectOption(option)
        } else {
          openMenu()
        }
        break
      case 'Home':
        if (isOpen) {
          event.preventDefault()
          setActiveIndex(nextEnabledIndex(-1, 1))
        }
        break
      case 'End':
        if (isOpen) {
          event.preventDefault()
          setActiveIndex(nextEnabledIndex(options.length, -1))
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
        {required ? (
          <span className="ml-0.5 text-maroon-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {name ? <input type="hidden" name={name} value={value} /> : null}
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
        aria-required={required}
        disabled={disabled}
        onClick={() => {
          if (isOpen) closeMenu()
          else openMenu()
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 text-left text-sm text-ink shadow-sm transition hover:border-stone-300 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-muted',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          isOpen && !error && 'border-maroon-500 ring-2 ring-maroon-500/20',
        )}
      >
        <span className={cn('min-w-0 truncate', !selectedOption && 'text-ink-muted/70')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-muted transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && menuPosition ? (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={fieldId}
          style={menuStyle}
          className="fixed z-50 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_16px_36px_-24px_rgba(23,23,23,0.45)]"
        >
          {options.length ? options.map((option, index) => {
            const isSelected = option.value === value
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
                onClick={() => selectOption(option)}
                className={cn(
                  'mx-1 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                  option.disabled && 'cursor-not-allowed text-ink-muted/50',
                  !option.disabled && isActive && 'bg-stone-100 text-ink',
                  !option.disabled && !isActive && 'text-ink hover:bg-stone-50',
                  isSelected && !option.disabled && 'font-medium text-maroon-800',
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-maroon-600" aria-hidden="true" /> : null}
              </div>
            )
          }) : (
            <p className="px-3 py-2 text-sm text-ink-muted">No options available.</p>
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
