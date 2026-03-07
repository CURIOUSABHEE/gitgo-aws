"use client"

import { useState } from "react"
import {
  ChevronRight,
  ChevronDown,
  FileCode2,
  Folder,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  language?: string
  active?: boolean
}

const fileTree: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "app",
        type: "folder",
        children: [
          { name: "layout.tsx", type: "file", language: "tsx" },
          { name: "page.tsx", type: "file", language: "tsx" },
          {
            name: "api",
            type: "folder",
            children: [
              {
                name: "auth",
                type: "folder",
                children: [
                  {
                    name: "route.ts",
                    type: "file",
                    language: "ts",
                    active: true,
                  },
                ],
              },
              {
                name: "users",
                type: "folder",
                children: [
                  { name: "route.ts", type: "file", language: "ts" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "components",
        type: "folder",
        children: [
          { name: "header.tsx", type: "file", language: "tsx" },
          { name: "sidebar.tsx", type: "file", language: "tsx" },
          { name: "dashboard.tsx", type: "file", language: "tsx" },
        ],
      },
      {
        name: "lib",
        type: "folder",
        children: [
          { name: "db.ts", type: "file", language: "ts" },
          { name: "utils.ts", type: "file", language: "ts" },
          { name: "auth.ts", type: "file", language: "ts" },
        ],
      },
    ],
  },
  { name: "package.json", type: "file", language: "json" },
  { name: "tsconfig.json", type: "file", language: "json" },
  { name: "README.md", type: "file", language: "md" },
]

function FileTreeItem({
  node,
  depth = 0,
}: {
  node: FileNode
  depth?: number
}) {
  const [isOpen, setIsOpen] = useState(
    node.name === "src" || node.name === "app" || node.name === "api" || node.name === "auth"
  )

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem key={child.name} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-secondary",
        node.active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileCode2 className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export function FileExplorer() {
  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Explorer
        </h3>
      </div>
      <ScrollArea className="flex-1 p-2">
        {fileTree.map((node) => (
          <FileTreeItem key={node.name} node={node} />
        ))}
      </ScrollArea>
    </div>
  )
}
