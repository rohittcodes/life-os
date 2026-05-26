"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useQuery } from "@tanstack/react-query"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarRail, useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible } from "radix-ui"
import {
  LayoutDashboard, CheckCircle2, Briefcase, Users, FolderKanban,
  Wallet, BookOpen, PenLine, StickyNote, Target,
  Settings, LogOut, ListTodo, HeartPulse, Timer,
  Library, Sunrise, Brain, Sun, Moon, ChevronRight,
  MessageSquare, UserCircle, CalendarCheck,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const coreNav = [
  { href: "/today",     label: "Today",     icon: CalendarCheck },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/habits",    label: "Habits",    icon: CheckCircle2 },
  { href: "/todos",     label: "To-Do",     icon: ListTodo },
  { href: "/notes",     label: "Daily Notes", icon: StickyNote },
  { href: "/goals",     label: "Goals",     icon: Target },
  { href: "/chats",     label: "AI Chats",  icon: MessageSquare },
]

// "Daily" — collapsible sub-menu, collapsed by default
const dailyNav = [
  { href: "/routine", label: "Morning Routine", icon: Sunrise },
  { href: "/review",  label: "Weekly Review",   icon: BookOpen },
]

// Work — plain group (no collapsible at the group level)
const workNav = [
  { href: "/jobs",      label: "Jobs",           icon: Briefcase },
  { href: "/freelance", label: "Work Pipeline",  icon: Users },
  { href: "/projects",  label: "Work Tasks",     icon: FolderKanban },
  { href: "/time",      label: "Time Tracker",   icon: Timer },
]

// Life — plain group
const lifeNav = [
  { href: "/finance",   label: "Finance",       icon: Wallet },
  { href: "/wellness",  label: "Wellness",       icon: HeartPulse },
  { href: "/knowledge", label: "Knowledge",      icon: Brain },
  { href: "/bookmarks", label: "Library",        icon: Library },
  { href: "/contacts",  label: "People & Subs",  icon: UserCircle },
  { href: "/blog",      label: "Blog",           icon: PenLine },
]

function useOverdueCount() {
  const { data = 0 } = useQuery({
    queryKey: ["overdue-count"],
    queryFn: async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]
      const { count } = await supabase
        .from("todos")
        .select("id", { count: "exact", head: true })
        .eq("done", false)
        .lt("due_date", today)
      return count ?? 0
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
  return data
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const overdueCount = useOverdueCount()
  const { resolvedTheme, setTheme } = useTheme()
  const { isMobile, setOpenMobile } = useSidebar()
  const [dailyOpen, setDailyOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  function closeMobile() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" variant="inset">

      {/* ── Brand / header ─────────────────────────────────────────── */}
      <SidebarHeader>
        <Link
          href="/dashboard"
          onClick={closeMobile}
          className={cn(
            "flex items-center gap-3 bg-sidebar-accent rounded-lg px-2 py-2 transition-colors",
            "hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2",
          )}
        >
          {/* Logo mark */}
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="text-[11px] font-bold tracking-tight">OS</span>
          </div>
          {/* Word mark */}
          <div className="flex flex-col leading-none min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">Life OS</span>
            <span className="text-[11px] text-muted-foreground font-normal mt-0.5">Personal dashboard</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">

        {/* ── Core nav ─────────────────────────────────────────────── */}
        <SidebarGroup className="py-1.5">
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className={cn(isActive(href) && "font-medium")}
                  >
                    <Link href={href} onClick={closeMobile}>
                      <Icon className="shrink-0" />
                      <span>{label}</span>
                      {label === "To-Do" && overdueCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white group-data-[collapsible=icon]:hidden">
                          {overdueCount > 99 ? "99+" : overdueCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Daily — item-level collapsible sub-menu */}
              {!mounted ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={dailyNav.some(n => isActive(n.href))}
                    tooltip="Daily"
                    className={cn(dailyNav.some(n => isActive(n.href)) && "font-medium")}
                  >
                    <Link href="/routine" onClick={closeMobile}>
                      <Sunrise className="shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">Daily</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <Collapsible.Root open={dailyOpen} onOpenChange={setDailyOpen}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={dailyNav.some(n => isActive(n.href))}
                      tooltip="Daily"
                      className={cn(dailyNav.some(n => isActive(n.href)) && "font-medium")}
                    >
                      <Collapsible.Trigger asChild>
                        <button className="flex w-full items-center">
                          <Sunrise className="shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">Daily</span>
                          <motion.span
                            animate={{ rotate: dailyOpen ? 90 : 0 }}
                            transition={{ duration: 0.17 }}
                            className="ml-auto group-data-[collapsible=icon]:hidden"
                          >
                            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                          </motion.span>
                        </button>
                      </Collapsible.Trigger>
                    </SidebarMenuButton>
                    <Collapsible.Content>
                      <SidebarMenuSub>
                        {dailyNav.map(({ href, label, icon: Icon }) => (
                          <SidebarMenuSubItem key={href}>
                            <SidebarMenuSubButton asChild isActive={isActive(href)}>
                              <Link href={href} onClick={closeMobile}>
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </Collapsible.Content>
                  </SidebarMenuItem>
                </Collapsible.Root>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider />

        {/* ── Work — plain group, no collapsible ───────────────────── */}
        <SidebarGroup className="py-1.5">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
            Work
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className={cn(isActive(href) && "font-medium")}
                  >
                    <Link href={href} onClick={closeMobile}>
                      <Icon className="shrink-0" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider />

        {/* ── Life — plain group ────────────────────────────────────── */}
        <SidebarGroup className="py-1.5">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
            Life
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {lifeNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className={cn(isActive(href) && "font-medium")}
                  >
                    <Link href={href} onClick={closeMobile}>
                      <Icon className="shrink-0" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <SidebarFooter className="pt-0">
        <Divider />
        <SidebarMenu className="mt-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              tooltip={mounted && resolvedTheme === "dark" ? "Light mode" : mounted ? "Dark mode" : "Theme"}
              className="text-muted-foreground hover:text-foreground"
            >
              <motion.span
                key={mounted ? resolvedTheme : "theme"}
                initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="shrink-0 flex items-center"
              >
                {mounted ? (resolvedTheme === "dark" ? <Sun /> : <Moon />) : <Moon />}
              </motion.span>
              <span>{mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "Theme"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/settings")}
              tooltip="Settings"
              className={cn(isActive("/settings") && "font-medium")}
            >
              <Link href="/settings" onClick={closeMobile}>
                <Settings className="shrink-0" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="shrink-0" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// Small helper — thin divider that hides when sidebar collapses to icon
function Divider() {
  return (
    <div className="mx-3 my-0.5 h-px bg-sidebar-border group-data-[collapsible=icon]:hidden" />
  )
}
