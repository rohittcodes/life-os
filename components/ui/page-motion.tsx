"use client"

import { motion } from "motion/react"

/** Wraps a page in a subtle fade-up entrance */
export function PageMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/** Staggered list: each direct child fades-up in sequence */
export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** A single card/row that slides up when it enters the viewport */
export function FadeInCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.22, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/** Stagger child variant — use as a direct child of StaggerList */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** A pressable div — adds whileTap scale-down for any interactive element */
export function Pressable({
  children,
  className,
  onClick,
  scale = 0.96,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  scale?: number
}) {
  return (
    <motion.div className={className} whileTap={{ scale }} onClick={onClick}>
      {children}
    </motion.div>
  )
}
