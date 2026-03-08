import { GitMerge, Award, Star, Rocket } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type MilestoneType = "pr-merged" | "badge-earned" | "first-star" | "first-contribution"

interface MilestoneCardProps {
  type: MilestoneType
  author: {
    name: string
    initials: string
  }
  message: string
  detail: string
  timeAgo: string
}

const milestoneConfig: Record<
  MilestoneType,
  { icon: typeof GitMerge; iconBg: string; iconColor: string; borderColor: string }
> = {
  "pr-merged": {
    icon: GitMerge,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    borderColor: "border-primary/20",
  },
  "badge-earned": {
    icon: Award,
    iconBg: "bg-yellow-500/15",
    iconColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
  },
  "first-star": {
    icon: Star,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  "first-contribution": {
    icon: Rocket,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    borderColor: "border-primary/20",
  },
}

export function MilestoneCard({
  type,
  author,
  message,
  detail,
  timeAgo,
}: MilestoneCardProps) {
  const config = milestoneConfig[type]
  const Icon = config.icon

  return (
    <div
      className={`rounded-xl border bg-card p-4 ${config.borderColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-secondary text-[9px] font-medium text-foreground">
                {author.initials}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium text-foreground">{message}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {detail} &middot; {timeAgo}
          </p>
        </div>
      </div>
    </div>
  )
}
