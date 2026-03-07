"use client"

import { useState } from "react"
import { Heart, MessageCircle, ExternalLink, MoreHorizontal, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"

interface FeedPostProps {
  postId: string
  author: {
    name: string
    handle: string
    initials: string
    avatar?: string
  }
  content: string
  codeSnippet?: {
    language: string
    code: string
  }
  likes: number
  comments: number
  repoLink?: string
  timeAgo: string
  onLike?: () => void
  onComment?: () => void
}

export function FeedPost({
  postId,
  author,
  content,
  codeSnippet,
  likes,
  comments,
  repoLink,
  timeAgo,
  onLike,
  onComment,
}: FeedPostProps) {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)
  const [commentCount, setCommentCount] = useState(comments)
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [showCommentDialog, setShowCommentDialog] = useState(false)

  const handleLike = async () => {
    if (isLiking || !session) return

    setIsLiking(true)
    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setLiked(data.liked)
        setLikeCount(data.likesCount)
        onLike?.()
      }
    } catch (error) {
      console.error("Failed to like post:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async () => {
    if (isCommenting || !session || !commentText.trim()) return

    setIsCommenting(true)
    try {
      const response = await fetch(`/api/community/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentText }),
      })

      if (response.ok) {
        const data = await response.json()
        setCommentCount(data.commentsCount)
        setCommentText("")
        setShowCommentDialog(false)
        onComment?.()
      }
    } catch (error) {
      console.error("Failed to comment:", error)
    } finally {
      setIsCommenting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      {/* Author header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {author.avatar && <AvatarImage src={author.avatar} alt={author.name} />}
            <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">
              {author.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{author.name}</p>
            <p className="text-xs text-muted-foreground">
              {author.handle} &middot; {timeAgo}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </div>

      {/* Content */}
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{content}</p>

      {/* Code snippet */}
      {codeSnippet && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {codeSnippet.language}
            </span>
          </div>
          <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-foreground/80">
            <code>{codeSnippet.code}</code>
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 px-2.5 text-xs ${liked ? "text-red-400 hover:text-red-400" : "text-muted-foreground"}`}
          onClick={handleLike}
          disabled={isLiking || !session}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
          {likeCount}
        </Button>
        
        <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
              disabled={!session}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {commentCount}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Write your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCommentDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleComment}
                  disabled={isCommenting || !commentText.trim()}
                >
                  {isCommenting ? (
                    <>
                      <Send className="mr-2 h-4 w-4 animate-pulse" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {repoLink && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
            onClick={() => window.open(repoLink, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Repo
          </Button>
        )}
      </div>
    </div>
  )
}
