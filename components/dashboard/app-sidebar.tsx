"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Terminal,
  LayoutDashboard,
  Compass,
  FolderGit2,
  FileUser,
  Settings,
  LogOut,
  TrendingUp,
  Layers,
  Users,
  Search,
  Award,
  Database,
  Sparkles,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGitHub } from "@/hooks/use-github"

const mainNav = [
  {
    title: "Overview",
    href: "/dashboard/overview",
    icon: Sparkles,
    description: "Dashboard home with your GitHub activity summary and quick stats",
  },
  {
    title: "Explore",
    href: "/dashboard/explore",
    icon: Compass,
    description: "Browse curated open-source repos with good first issues",
  },
  {
    title: "Smart Matches",
    href: "/dashboard/recommendations",
    icon: Sparkles,
    description: "AI-powered repo recommendations based on your skills and projects",
  },
  {
    title: "GSoC Orgs",
    href: "/dashboard/gsoc",
    icon: Award,
    description: "Discover Google Summer of Code organizations and opportunities",
  },
  {
    title: "My Projects",
    href: "/dashboard/projects",
    icon: FolderGit2,
    description: "View and manage your personal GitHub repositories",
  },
  {
    title: "Analyze Repo",
    href: "/dashboard/analyze",
    icon: Search,
    description: "Deep analysis of any GitHub repo with architecture insights",
  },
  {
    title: "Community",
    href: "/dashboard/community",
    icon: Users,
    description: "Connect with other developers and join discussions",
  },
  {
    title: "Portfolio",
    href: "/dashboard/portfolio",
    icon: FileUser,
    description: "Generate and customize your developer portfolio",
  },
]

const filters = [
  {
    title: "My Tech Stack",
    href: "/dashboard?filter=techstack",
    icon: Layers,
    description: "Filter content based on your detected technologies",
  },
  {
    title: "Trending",
    href: "/dashboard/trending",
    icon: TrendingUp,
    description: "See trending repositories on GitHub",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { profile } = useGitHub()

  const userName = profile?.user.name || "User"
  const userLogin = profile?.user.login || "user"
  const userAvatar = profile?.user.avatar_url

  // Generate initials from name or username detereministically
  const initials = profile?.user.name
    ? profile.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.user.login
      ? profile.user.login.slice(0, 2).toUpperCase()
      : "US"

  // Get languages from profile (same as My Projects page)
  const languages = profile?.languages || []

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  // To prevent hydration warnings due to user initials/names being calculated on client side, 
  // return a skeletal footer until mounted.
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Terminal className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">gitgo</span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Filters</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filters.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Skills Detected</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-wrap gap-1.5 px-2">
              {languages.length > 0 ? (
                languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No skills detected yet</span>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/dashboard/settings"}
                  >
                    <Link href="/dashboard/settings">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">Settings</p>
                    <p className="text-xs text-muted-foreground">Configure profile, integrations, and preferences</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        {mounted ? (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-8 w-8">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
              <AvatarFallback className="bg-secondary text-xs text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-foreground">
                {userName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{userLogin}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 h-12 invisible"></div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
