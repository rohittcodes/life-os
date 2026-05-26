"use client"

import { useState } from "react"
import { Brain, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

export function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="not-prose my-1.5 overflow-hidden rounded-lg border border-border/50 bg-muted/20">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3 shrink-0" />
        <span className="font-medium">Reasoning</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronDown className="h-3 w-3" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-2.5 text-xs leading-relaxed text-muted-foreground/80 italic">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
