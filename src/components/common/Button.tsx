import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600 disabled:pointer-events-none disabled:opacity-50'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-maroon-600 text-white shadow-sm hover:bg-maroon-700',
  secondary: 'bg-maroon-50 text-maroon-700 hover:bg-maroon-100',
  outline: 'border border-line bg-white text-ink hover:border-maroon-300 hover:bg-maroon-50',
  ghost: 'text-ink-muted hover:bg-surface-soft hover:text-ink',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  accent: 'bg-gold-500 text-maroon-900 shadow-sm hover:bg-gold-400',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  )
}
