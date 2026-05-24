"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface Props {
  className?: string
  iconClassName?: string
}

export function ThemeToggle({ className, iconClassName }: Props) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "relative flex items-center justify-center rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        className,
      )}
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          "transition-all rotate-0 scale-100 dark:-rotate-90 dark:scale-0",
          iconClassName ?? "h-4 w-4",
        )}
      />
      <Moon
        className={cn(
          "absolute transition-all rotate-90 scale-0 dark:rotate-0 dark:scale-100",
          iconClassName ?? "h-4 w-4",
        )}
      />
    </button>
  )
}
