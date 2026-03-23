import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const periodFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as Russian currency (with space as thousand separator)
 */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return moneyFormatter.format(value)
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value)}%`
}

/**
 * Calculate percentage (fact / plan * 100)
 */
export function calculatePercent(fact: number | null, plan: number | null): number | null {
  if (!fact || !plan || plan === 0) return null
  return (fact / plan) * 100
}

/**
 * Format date as Russian locale
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return dateFormatter.format(new Date(date))
}

/**
 * Format date as DD.MM.YYYY
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return shortDateFormatter.format(new Date(date))
}

/**
 * Format month/year for period display
 */
export function formatPeriod(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return periodFormatter.format(new Date(date))
}

/**
 * Get initials from full name
 */
export function getInitials(fullName: string): string {
  const parts = fullName.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return fullName.slice(0, 2).toUpperCase()
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Get current period as YYYY-MM-01 string (first day of current month)
 */
export function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}
