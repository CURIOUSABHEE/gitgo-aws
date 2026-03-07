"use client"

import { useState, useRef } from "react"
import { Code, ImageIcon, Link2, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useGitHub } from "@/hooks/use-github"
import { useToast } from "@/hooks/use-toast"

interface PostComposerProps {
  onPostCreated?: () => void
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const { profile } = useGitHub()
  const { toast } = useToast()
  const [posting, setPosting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const userAvatar = profile?.user.avatar_url
  const userName = profile?.user.name || profile?.user.login || "User"
  const initials = profile?.user.name
    ? profile.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.user.login?.slice(0, 2).toUpperCase() || "U"

  const handlePost = async () => {
    const content = contentRef.current?.textContent?.trim()
    
    if (!content) {
      toast({
        title: "Error",
        description: "Please write something before posting",
        variant: "destructive",
      })
      return
    }

    setPosting(true)

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          type: "post",
          tags: [],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create post")
      }

      // Clear content
      if (contentRef.current) {
        contentRef.current.textContent = ""
      }

      toast({
        title: "Success",
        description: "Your post has been published!",
      })

      // Notify parent to refresh posts
      onPostCreated?.()
    } catch (error) {
      console.error("Failed to create post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
          <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div
            ref={contentRef}
            className="min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors focus-within:border-primary/40 empty:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="What are you building today?"
            data-placeholder="What are you building today?"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                disabled
              >
                <Code className="h-3.5 w-3.5" />
                Code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                disabled
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Image
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                disabled
              >
                <Link2 className="h-3.5 w-3.5" />
                Link
              </Button>
            </div>
            <Button 
              size="sm" 
              className="h-8 px-4 text-xs font-medium"
              onClick={handlePost}
              disabled={posting}
            >
              {posting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
