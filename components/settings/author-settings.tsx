"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { saveAuthorProfile, checkUsernameAvailability } from "@/app/(app)/settings/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Check, Loader2, X } from "lucide-react"

interface Props {
  displayName: string
  authorBio: string
  avatarUrl: string
  websiteUrl: string
  username: string
}

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid"

export function AuthorSettings({ displayName, authorBio, avatarUrl, websiteUrl, username }: Props) {
  const [avatar, setAvatar] = useState(avatarUrl)
  const [avatarError, setAvatarError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const [usernameInput, setUsernameInput] = useState(username)
  const [usernameState, setUsernameState] = useState<UsernameState>("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cleaned = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
    if (!cleaned || cleaned === username) { setUsernameState("idle"); return }
    if (cleaned.length < 3) { setUsernameState("invalid"); return }

    setUsernameState("checking")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { available, reason } = await checkUsernameAvailability(cleaned)
      setUsernameState(available ? "available" : reason ? "invalid" : "taken")
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [usernameInput, username])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveAuthorProfile(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-medium">Author profile</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Shown on your public blog posts at <code className="text-xs bg-muted px-1 rounded">/p/[slug]</code>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Display name</Label>
          <Input id="display_name" name="display_name" defaultValue={displayName} placeholder="Rohith Singh" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">/u/</span>
            <div className="relative flex-1">
              <Input
                id="username"
                name="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="rohith"
                className={
                  usernameState === "taken" ? "border-red-500 pr-8" :
                  usernameState === "available" ? "border-green-500 pr-8" : "pr-8"
                }
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {usernameState === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {usernameState === "available" && <Check className="h-3.5 w-3.5 text-green-500" />}
                {usernameState === "taken" && <X className="h-3.5 w-3.5 text-red-500" />}
              </span>
            </div>
          </div>
          {usernameState === "taken" && (
            <p className="text-[11px] text-red-500">Username already taken</p>
          )}
          {usernameState === "available" && (
            <p className="text-[11px] text-green-600 dark:text-green-400">Username available</p>
          )}
          {usernameState === "invalid" && (
            <p className="text-[11px] text-muted-foreground">3–30 chars, letters/numbers/- only</p>
          )}
          {usernameState === "idle" && username && (
            <p className="text-[11px] text-muted-foreground">
              Public profile: <a href={`/u/${username}`} target="_blank" className="text-primary hover:underline">/u/{username}</a>
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="website_url">Website</Label>
          <Input id="website_url" name="website_url" type="url" defaultValue={websiteUrl} placeholder="https://yoursite.com" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="author_bio">Bio</Label>
        <Textarea id="author_bio" name="author_bio" defaultValue={authorBio} rows={2} placeholder="Builder, writer, product thinker…" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="url"
          defaultValue={avatarUrl}
          placeholder="https://example.com/photo.jpg"
          onChange={(e) => { setAvatar(e.target.value); setAvatarError(false) }}
        />
        {avatar && !avatarError && (
          <div className="relative mt-2 h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
            <Image src={avatar} alt="Avatar" fill className="object-cover" onError={() => setAvatarError(true)} unoptimized />
          </div>
        )}
        {avatarError && <p className="text-xs text-red-500">Could not load image — check the URL</p>}
      </div>

      <Button type="submit" disabled={pending || usernameState === "taken"} className="w-full sm:w-auto">
        {pending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : saved ? <><Check className="h-4 w-4 mr-1.5" />Saved</> : "Save author profile"}
      </Button>
    </form>
  )
}
