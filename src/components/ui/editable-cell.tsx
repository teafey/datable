"use client"

import * as React from "react"
import { formatMoney, cn } from "@/lib/utils"

// Context для TAB навигации между ячейками в таблице
const EditableCellContext = React.createContext<{
  register: (id: string, startEdit: () => void) => void
  unregister: (id: string) => void
  focusNext: (currentId: string) => void
  focusPrev: (currentId: string) => void
} | null>(null)

// Provider для обёртки таблицы
export function EditableCellProvider({ children }: { children: React.ReactNode }) {
  const cellsRef = React.useRef<Map<string, () => void>>(new Map())
  const orderRef = React.useRef<string[]>([])

  const value = React.useMemo(() => ({
    register: (id: string, startEdit: () => void) => {
      cellsRef.current.set(id, startEdit)
      if (!orderRef.current.includes(id)) {
        orderRef.current.push(id)
      }
    },
    unregister: (id: string) => {
      cellsRef.current.delete(id)
      orderRef.current = orderRef.current.filter(x => x !== id)
    },
    focusNext: (currentId: string) => {
      const idx = orderRef.current.indexOf(currentId)
      const nextId = orderRef.current[idx + 1]
      if (nextId) {
        const startEdit = cellsRef.current.get(nextId)
        // Небольшая задержка чтобы blur успел отработать
        setTimeout(() => startEdit?.(), 0)
      }
    },
    focusPrev: (currentId: string) => {
      const idx = orderRef.current.indexOf(currentId)
      const prevId = orderRef.current[idx - 1]
      if (prevId) {
        const startEdit = cellsRef.current.get(prevId)
        setTimeout(() => startEdit?.(), 0)
      }
    },
  }), [])

  return (
    <EditableCellContext.Provider value={value}>
      {children}
    </EditableCellContext.Provider>
  )
}

// Компонент ячейки
interface EditableCellProps {
  id: string                     // Уникальный ID для TAB навигации
  value: number | null
  onChange: (value: number | null) => void
  suffix?: string
  placeholder?: string
  colorClass?: string
  disabled?: boolean
}

export function EditableCell({
  id,
  value,
  onChange,
  suffix = "₽",
  placeholder = "—",
  colorClass,
  disabled = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ctx = React.useContext(EditableCellContext)

  const handleStartEdit = React.useCallback(() => {
    if (disabled) return
    setInputValue(value !== null ? String(value) : "")
    setIsEditing(true)
  }, [disabled, value])

  // Регистрация в контексте для TAB навигации
  React.useEffect(() => {
    if (ctx) {
      ctx.register(id, handleStartEdit)
      return () => ctx.unregister(id)
    }
  }, [id, ctx, handleStartEdit])

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = React.useCallback(() => {
    setIsEditing(false)
    const numValue = inputValue.trim() === "" ? null : parseFloat(inputValue.replace(/\s/g, ""))
    if (numValue !== value && (numValue === null || !isNaN(numValue))) {
      onChange(numValue)
    }
  }, [inputValue, value, onChange])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      handleSave()
      if (e.key === "Tab") {
        if (e.shiftKey) {
          ctx?.focusPrev(id)
        } else {
          ctx?.focusNext(id)
        }
      }
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }, [handleSave, ctx, id])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-right tabular-nums outline-none border-b border-accent px-0 py-0"
      />
    )
  }

  return (
    <span
      onClick={handleStartEdit}
      className={cn(
        "cursor-pointer hover:text-accent tabular-nums transition-colors whitespace-nowrap",
        disabled && "cursor-default hover:text-inherit opacity-60",
        colorClass
      )}
    >
      {value !== null ? `${formatMoney(value)}\u00a0${suffix}` : <span className="text-text-disabled">{placeholder}</span>}
    </span>
  )
}
