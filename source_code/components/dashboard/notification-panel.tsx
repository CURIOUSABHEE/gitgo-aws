"use client"

import { useState } from "react"
import {
  GitPullRequest,
  MessageCircle,
  Rocket,
  CheckCheck,
  AtSign,
  AlertTriangle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useGitHub } from "@/hooks/use-github"

type NotificationType = "repo-alert" | "social" | "mention" | "pr-update"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timeAgo: string
  read: boolean
  author?: {
    name: string
    initials: string
  }
  priority?: "high" | "normal"
}

const initialNotifications: Notification[] = []

const iconMap: Record<NotificationType, typeof GitPullRequest> = {
  "repo-alert": Rocket,
  social: MessageCircle,
  mention: AtSign,
  "pr-update": GitPullRequest,
}

const iconColorMap: Record<NotificationType, string> = {
  "repo-alert": "bg-primary/15 text-primary",
  social: "bg-blue-500/15 text-blue-400",
  mention: "bg-yellow-500/15 text-yellow-400",
  "pr-update": "bg-primary/15 text-primary",
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const Icon = iconMap[notification.type]
  const colorClass = iconColorMap[notification.type]

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent ${
        !notification.read ? "bg-accent/50" : ""
      }`}
    >
      {notification.author ? (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary text-[10px] font-medium text-foreground">
            {notification.author.initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
          {notification.priority === "high" && (
            <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-400" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {notification.description}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {notification.timeAgo}
        </p>
      </div>
    </button>
  )
}

export function NotificationPanel() {
  const { profile } = useGitHub()
  const userLogin = profile?.user.login || "user"
  
  // Update the mention notification with actual username
  const initialNotificationsWithUser = initialNotifications.map(notif => 
    notif.id === "4" 
      ? { ...notif, description: `"@${userLogin} you should check out the FastAPI docs refactor!"` }
      : notif
  )
  
  const [notifications, setNotifications] = useState(initialNotificationsWithUser)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const filterByTab = (tab: string) => {
    switch (tab) {
      case "mentions":
        return notifications.filter((n) => n.type === "mention")
      case "alerts":
        return notifications.filter((n) => n.type === "repo-alert" || n.type === "pr-update")
      default:
        return notifications
    }
  }

  return (
    <div className="w-[380px] rounded-xl border border-border bg-card shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={markAllRead}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      {/* Tabs and Content */}
      <Tabs defaultValue="all" className="w-full">
        <div className="border-b border-border px-4">
          <TabsList className="h-9 w-full justify-start gap-0 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="mentions"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Mentions
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Alerts
            </TabsTrigger>
          </TabsList>
        </div>

        {["all", "mentions", "alerts"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <ScrollArea className="h-[380px]">
              <div className="flex flex-col p-1.5">
                {filterByTab(tab).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  filterByTab(tab).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
