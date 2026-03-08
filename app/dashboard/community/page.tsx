"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PostComposer } from "@/components/community/post-composer"
import { FeedPost } from "@/components/community/feed-post"
import { MilestoneCard } from "@/components/community/milestone-card"
import { Loader2 } from "lucide-react"

interface Post {
  _id: string
  author: {
    githubId: string
    login: string
    name: string
    avatar_url: string
  }
  content: string
  type: "post" | "milestone" | "achievement"
  milestone?: {
    title: string
    description: string
    icon: string
  }
  likes: string[]
  comments: Array<{
    userId: string
    author: {
      login: string
      name: string
      avatar_url: string
    }
    content: string
    createdAt: string
  }>
  tags: string[]
  createdAt: string
  updatedAt: string
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/community/posts")
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleNewPost = () => {
    // Refresh posts after new post is created
    fetchPosts()
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Community" />

      <div className="mx-auto w-full max-w-2xl flex-1 p-6">
        {/* Composer */}
        <PostComposer onPostCreated={handleNewPost} />

        {/* Feed */}
        <div className="mt-6 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                No posts yet. Be the first to share something!
              </p>
            </div>
          ) : (
            posts.map((post) => {
              if (post.type === "milestone" || post.type === "achievement") {
                return (
                  <MilestoneCard
                    key={post._id}
                    type={post.milestone?.icon as any || "first-contribution"}
                    author={{
                      name: post.author.name,
                      initials: post.author.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
                    }}
                    message={post.milestone?.title || post.content}
                    detail={post.milestone?.description || ""}
                    timeAgo={getTimeAgo(post.createdAt)}
                  />
                )
              }

              return (
                <FeedPost
                  key={post._id}
                  postId={post._id}
                  author={{
                    name: post.author.name,
                    handle: `@${post.author.login}`,
                    initials: post.author.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
                    avatar: post.author.avatar_url,
                  }}
                  content={post.content}
                  likes={post.likes.length}
                  comments={post.comments.length}
                  timeAgo={getTimeAgo(post.createdAt)}
                  onLike={() => fetchPosts()}
                  onComment={() => fetchPosts()}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
