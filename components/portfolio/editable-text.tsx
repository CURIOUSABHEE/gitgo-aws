"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil } from "lucide-react"

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  editable?: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
}

export function EditableText({
  value,
  onChange,
  editable = false,
  className = "",
  style = {},
  placeholder = "Click to edit",
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === "Escape") {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  if (!editable) {
    return (
      <div className={className} style={style}>
        {value || placeholder}
      </div>
    )
  }

  if (isEditing) {
    const Component = multiline ? "textarea" : "input"
    return (
      <Component
        ref={inputRef as any}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} border-2 border-primary/50 bg-transparent outline-none`}
        style={style}
        placeholder={placeholder}
        rows={multiline ? 4 : undefined}
      />
    )
  }

  return (
    <div
      className={`${className} group relative cursor-pointer transition-all hover:opacity-80`}
      style={style}
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
      <Pencil className="absolute -right-6 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50" />
    </div>
  )
}
