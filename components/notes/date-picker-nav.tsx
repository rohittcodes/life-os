"use client"

import { useRouter } from "next/navigation"

interface Props { value: string }

export function DatePickerNav({ value }: Props) {
  const router = useRouter()
  return (
    <input
      type="date"
      defaultValue={value}
      onChange={(e) => router.push(`/notes?date=${e.target.value}`)}
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}
