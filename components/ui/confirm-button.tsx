"use client"

import { useState, type ReactNode } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmButtonProps {
  /** The trigger element — clicking it opens the dialog */
  children: ReactNode
  /** Dialog heading */
  title?: string
  /** Supporting text below the heading */
  description?: string
  /** Label on the confirm button */
  confirmLabel?: string
  /** Called when the user confirms */
  onConfirm: () => void
  /** "destructive" turns the confirm button red */
  variant?: "destructive" | "default"
}

export function ConfirmButton({
  children,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "destructive",
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Intercept the click on the trigger */}
      <span
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="contents"
      >
        {children}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={() => { onConfirm(); setOpen(false) }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
