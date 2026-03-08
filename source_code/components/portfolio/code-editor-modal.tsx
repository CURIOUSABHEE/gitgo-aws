"use client"

import { useState } from "react"
import { X, Download, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CodeEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  html: string
  onDownload: () => void
}

export function CodeEditorModal({
  open,
  onOpenChange,
  html,
  onDownload,
}: CodeEditorModalProps) {
  const [copied, setCopied] = useState(false)

  // Extract CSS from HTML
  const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/)
  const css = cssMatch ? cssMatch[1] : ""

  // Extract body content
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/)
  const bodyContent = bodyMatch ? bodyMatch[1] : ""

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Portfolio Code</DialogTitle>
          <DialogDescription>
            View and copy your portfolio HTML/CSS. You can customize it freely after downloading.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="html" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="html">Full HTML</TabsTrigger>
            <TabsTrigger value="css">CSS Only</TabsTrigger>
            <TabsTrigger value="body">HTML Body</TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="flex-1 overflow-auto mt-4">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="absolute right-2 top-2 z-10"
                onClick={() => handleCopy(html)}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <pre className="rounded-lg bg-secondary p-4 text-xs overflow-auto max-h-[50vh]">
                <code>{html}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="css" className="flex-1 overflow-auto mt-4">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="absolute right-2 top-2 z-10"
                onClick={() => handleCopy(css)}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <pre className="rounded-lg bg-secondary p-4 text-xs overflow-auto max-h-[50vh]">
                <code>{css}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="body" className="flex-1 overflow-auto mt-4">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="absolute right-2 top-2 z-10"
                onClick={() => handleCopy(bodyContent)}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <pre className="rounded-lg bg-secondary p-4 text-xs overflow-auto max-h-[50vh]">
                <code>{bodyContent}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download HTML
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
