"use client"

import { motion } from "motion/react"
import { Flame } from "lucide-react"

interface Props {
  greeting: string
  dateStr: string
  streak: number
}

export function DashboardHero({ greeting, dateStr, streak }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-7">
      {/* Wave layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <svg
          className="absolute bottom-[-2px] left-0 w-[200%] animate-wave-drift opacity-[0.09]"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,40 C180,70 360,10 540,40 C720,70 900,10 1080,40 C1260,70 1440,10 1440,40 L1440,80 L0,80 Z" />
          <path d="M1440,40 C1260,70 1080,10 900,40 C720,70 540,10 360,40 C180,70 0,10 0,40 L0,80 L1440,80 Z" />
        </svg>
        <svg
          className="absolute bottom-[-2px] left-0 w-[200%] animate-wave-drift-reverse opacity-[0.06]"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,50 C240,20 480,70 720,50 C960,30 1200,65 1440,50 L1440,80 L0,80 Z" />
          <path d="M1440,50 C1200,20 960,70 720,50 C480,30 240,65 0,50 L0,80 L1440,80 Z" />
        </svg>
        <svg
          className="absolute bottom-[-2px] left-0 w-[200%] animate-wave-drift-slow opacity-[0.04]"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1440,15 1440,30 L1440,80 L0,80 Z" />
          <path d="M1440,30 C1080,60 720,0 360,30 C180,45 0,15 0,30 L0,80 L1440,80 Z" />
        </svg>
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateStr}</p>
        </motion.div>

        {streak > 0 && (
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 18 }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5"
          >
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {streak} day streak
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
