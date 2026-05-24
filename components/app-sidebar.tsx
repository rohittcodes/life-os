"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard, CheckCircle2, Briefcase, Users, FolderKanban,
  Wallet, BookOpen, PenLine, StickyNote, Target, Bookmark,
  UserCircle, Settings, LogOut, ListTodo, HeartPulse, Timer,
  Library, Sunrise, Brain,
} from "lucide-react"

const coreNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/routine", label: "Morning Routine", icon: Sunrise },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/todos", label: "To-Do", icon: ListTodo },
  { href: "/notes", label: "Daily Notes", icon: StickyNote },
  { href: "/goals", label: "Goals", icon: Target },
]

const workNav = [
  { href: "/jobs", label: "Job Hunt", icon: Briefcase },
  { href: "/freelance", label: "Freelance", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/time", label: "Time Tracker", icon: Timer },
]

const lifeNav = [
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/bookmarks", label: "Library", icon: Library },
  { href: "/contacts", label: "People & Subs", icon: UserCircle },
  { href: "/review", label: "Weekly Review", icon: BookOpen },
  { href: "/blog", label: "Blog", icon: PenLine },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background">
                  <span className="text-xs font-bold">OS</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Life OS</span>
                  <span className="text-xs text-muted-foreground">Personal dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
                    <Link href={href}><Icon /><span>{label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
                    <Link href={href}><Icon /><span>{label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Life</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {lifeNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
                    <Link href={href}><Icon /><span>{label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
              <Link href="/settings"><Settings /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out">
              <LogOut /><span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
