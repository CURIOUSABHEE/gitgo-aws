import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Truncate text to a maximum length
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Format large numbers with K, M suffixes
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Parse GitHub URL to extract owner and repo
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return null
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    }
  } catch {
    return null
  }
}

// Method color for route cards
export function methodColor(method: string): string {
  const m = method?.toUpperCase()
  switch (m) {
    case 'GET':
      return 'border-green-500/40 bg-green-500/10 text-green-400'
    case 'POST':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-400'
    case 'PUT':
    case 'PATCH':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
    case 'DELETE':
      return 'border-red-500/40 bg-red-500/10 text-red-400'
    case 'PAGE':
      return 'border-purple-500/40 bg-purple-500/10 text-purple-400'
    default:
      return 'border-slate-500/40 bg-slate-500/10 text-slate-400'
  }
}

// Lifecycle color for route cards
export function lifecycleColor(role: string): string {
  switch (role) {
    case 'Authentication':
      return 'bg-red-500/10 text-red-400 border border-red-500/20'
    case 'Data Fetching':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    case 'CRUD Operation':
      return 'bg-green-500/10 text-green-400 border border-green-500/20'
    case 'UI Rendering':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
    case 'File Processing':
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'Third-party Integration':
      return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
    case 'Real-time':
      return 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
    case 'Navigation':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    case 'Background Processing':
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
  }
}
