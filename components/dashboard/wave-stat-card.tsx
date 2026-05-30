"use client"

import { motion, useMotionValue, useTransform, animate } from "motion/react"
import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface WaveStatCardProps {
  label: string
  value: string | number
  href: string
  iconNode: ReactNode     // pre-rendered JSX — safe to pass from Server Components
  fill: string            // tailwind fill color for wave e.g. "fill-blue-500/20"
  pct?: number            // 0-100, controls wave height
  delay?: number
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.9, ease: "easeOut" })
    return ctrl.stop
  }, [value, mv])

  return <motion.span>{rounded}</motion.span>
}

export function WaveStatCard({ label, value, href, iconNode, fill, pct = 40, delay = 0 }: WaveStatCardProps) {
  const numericValue = typeof value === "number" ? value : null
  const clampedPct = Math.min(100, Math.max(8, pct))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
      >
        {/* Liquid wave fill */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: `${clampedPct}%` }}
          aria-hidden
        >
          <svg
            className={cn("absolute bottom-0 left-0 w-[200%] animate-wave-drift", fill)}
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
          >
            <path d="M0,30 C50,50 100,10 150,30 C200,50 250,10 300,30 C350,50 400,10 400,30 L400,60 L0,60 Z" />
            <path d="M400,30 C350,50 300,10 250,30 C200,50 150,10 100,30 C50,50 0,10 0,30 L0,60 L400,60 Z" />
          </svg>
        </div>

        <div className="relative">
          <div className="rounded-lg bg-muted/60 p-1.5 w-fit transition-colors group-hover:bg-muted">
            {iconNode}
          </div>
        </div>

        <div className="relative mt-3">
          <div className="text-2xl font-bold tabular-nums leading-none">
            {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </Link>
    </motion.div>
  )
}
