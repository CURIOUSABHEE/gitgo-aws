"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  Briefcase,
  GraduationCap,
  Sparkles,
  AlertCircle,
  FolderGit2,
  User,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface SkillGroup {
  category: string
  skills: string[]
}

interface ResumeData {
  fileName: string
  uploadedAt: string
  name?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  careerObjective?: string
  skills?: string[]
  skillGroups?: SkillGroup[]
  experience?: {
    title: string
    company: string
    duration: string
    description: string
  }[]
  education?: {
    degree: string
    institution: string
    year: string
    details?: string
  }[]
  projects?: {
    name: string
    description: string
    technologies: string[]
    githubUrl?: string
    duration?: string
  }[]
  certifications?: string[]
}

export function SettingsResume() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing resume data on mount
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await fetch("/api/user/resume")
        if (res.ok) {
          const json = await res.json()
          setResumeData(json.data)
        }
      } catch (err) {
        console.error("Failed to fetch resume:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchResume()
  }, [])

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("resume", file)

      const res = await fetch("/api/user/resume", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Upload failed")
      }

      const json = await res.json()
      setResumeData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await fetch("/api/user/resume", { method: "DELETE" })
      setResumeData(null)
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      uploadFile(droppedFile)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      uploadFile(selectedFile)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return "Unknown"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalSkills = resumeData?.skillGroups?.reduce((sum, g) => sum + g.skills.length, 0) || 0

  return (
    <div className="w-full max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume to extract skills, experience, and education. This data
          helps improve AI matching with open source projects.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Only text-based PDFs are supported. Scanned PDFs will not work.</span>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Current file */}
      {resumeData && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">
                  {resumeData.fileName}
                </p>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDate(resumeData.uploadedAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}

      {/* Upload zone */}
      {isUploading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 px-6 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Parsing your resume...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Extracting skills, experience, projects, and education
          </p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            If this is a scanned PDF, OCR processing may take 30-60 seconds
          </p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-muted-foreground/30"
            }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            {resumeData ? "Replace your resume" : "Upload your resume"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag and drop your PDF here, or click to browse
          </p>
          <label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="sr-only"
              onChange={handleFileSelect}
            />
            <Button variant="secondary" size="sm" className="mt-4 h-8 text-xs" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      )}

      {/* Parsed data display */}
      {resumeData && (
        <>
          {/* Contact Information */}
          {(resumeData.name || resumeData.email || resumeData.phone || resumeData.location) && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Contact Information
                  </h3>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  {resumeData.name && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-20">Name:</span>
                      <span className="text-sm text-foreground">{resumeData.name}</span>
                    </div>
                  )}
                  {resumeData.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-20">Email:</span>
                      <span className="text-sm text-foreground">{resumeData.email}</span>
                    </div>
                  )}
                  {resumeData.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-20">Phone:</span>
                      <span className="text-sm text-foreground">{resumeData.phone}</span>
                    </div>
                  )}
                  {resumeData.location && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-20">Location:</span>
                      <span className="text-sm text-foreground">{resumeData.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Career Objective */}
          {resumeData.careerObjective && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Career Objective
                  </h3>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {resumeData.careerObjective}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Grouped Skills */}
          {resumeData.skillGroups && resumeData.skillGroups.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Technologies & Skills
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {totalSkills}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {resumeData.skillGroups.map((group, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {group.category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Education */}
          {resumeData.education && resumeData.education.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Education
                  </h3>
                </div>
                <div className="flex flex-col gap-3">
                  {resumeData.education.map((edu, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {edu.institution || edu.degree}
                          </p>
                          {edu.institution && edu.degree && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {edu.degree}
                            </p>
                          )}
                          {edu.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {edu.details}
                            </p>
                          )}
                        </div>
                        {edu.year && (
                          <span className="text-xs font-medium text-primary/80 whitespace-nowrap">
                            {edu.year}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Projects */}
          {resumeData.projects && resumeData.projects.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FolderGit2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Projects
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {resumeData.projects.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {resumeData.projects.map((proj, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {proj.name}
                            </p>
                            {proj.githubUrl && proj.githubUrl.startsWith("http") && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {proj.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                              {proj.description}
                            </p>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {proj.technologies.map((tech) => (
                                <span
                                  key={tech}
                                  className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {proj.duration && (
                          <span className="text-xs font-medium text-primary/80 whitespace-nowrap">
                            {proj.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Experience */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Work Experience
                  </h3>
                </div>
                <div className="flex flex-col gap-3">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {exp.title}
                          </p>
                          {exp.company && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {exp.company}
                            </p>
                          )}
                          {exp.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                              {exp.description}
                            </p>
                          )}
                        </div>
                        {exp.duration && (
                          <span className="text-xs font-medium text-primary/80 whitespace-nowrap">
                            {exp.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Certifications */}
          {resumeData.certifications && resumeData.certifications.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Certifications
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {resumeData.certifications.length}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap gap-2">
                    {resumeData.certifications.map((cert, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Separator className="my-6" />

      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Your resume is processed on the server and used only for matching. It is
          never shared with third parties or repository maintainers.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Only text-based PDFs are supported. Scanned PDFs (image-based) will not work.
          If you have a scanned PDF, please convert it using an online OCR tool first.
        </p>
      </div>
    </div>
  )
}
