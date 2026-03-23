"use client"

interface EmptyStateProps {
  colSpan: number
  message?: string
}

export function EmptyState({ colSpan, message = "Нет данных" }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="table-cell text-center py-8">
        <p className="text-text-tertiary">{message}</p>
      </td>
    </tr>
  )
}
