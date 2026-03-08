"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SettingsProfile } from "@/components/settings/settings-profile"
import { SettingsIntegrations } from "@/components/settings/settings-integrations"
import { SettingsResume } from "@/components/settings/settings-resume"
import { SettingsPreferences } from "@/components/settings/settings-preferences"
import { SettingsTechnologyMap } from "@/components/settings/settings-technology-map"
import { SettingsSubscription } from "@/components/settings/settings-subscription"
import { SettingsDatabase } from "@/components/settings/settings-database"
import { User, Plug, FileText, SlidersHorizontal, Code2, CreditCard, Database } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "technology", label: "Technology Map", icon: Code2 },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "database", label: "Repository Database", icon: Database },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile")

  return (
    <div className="flex flex-col overflow-hidden">
      <DashboardHeader title="Settings" />

      <div className="flex flex-1 flex-col gap-6 overflow-x-hidden p-4 sm:p-6 lg:flex-row">
        {/* Settings sidebar */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto pb-2 scrollbar-hide lg:w-56 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Settings content */}
        <div className="min-w-0 flex-1">
          {activeTab === "profile" && <SettingsProfile />}
          {activeTab === "technology" && <SettingsTechnologyMap />}
          {activeTab === "subscription" && <SettingsSubscription />}
          {activeTab === "integrations" && <SettingsIntegrations />}
          {activeTab === "resume" && <SettingsResume />}
          {activeTab === "preferences" && <SettingsPreferences />}
          {activeTab === "database" && <SettingsDatabase />}
        </div>
      </div>
    </div>
  )
}
