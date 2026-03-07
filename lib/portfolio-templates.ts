// Portfolio Template System

export type TemplateType = "minimal" | "creative" | "professional" | "student"
export type ColorTheme = "midnight" | "ocean" | "forest" | "sunset" | "lavender" | "monochrome"

export interface PortfolioTheme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textMuted: string
    border: string
  }
}

export const colorThemes: Record<ColorTheme, PortfolioTheme> = {
  midnight: {
    name: "Midnight",
    colors: {
      primary: "#3b82f6",
      secondary: "#1e293b",
      accent: "#60a5fa",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f1f5f9",
      textMuted: "#94a3b8",
      border: "#334155",
    },
  },
  ocean: {
    name: "Ocean",
    colors: {
      primary: "#06b6d4",
      secondary: "#164e63",
      accent: "#22d3ee",
      background: "#083344",
      surface: "#0e7490",
      text: "#f0fdfa",
      textMuted: "#99f6e4",
      border: "#155e75",
    },
  },
  forest: {
    name: "Forest",
    colors: {
      primary: "#10b981",
      secondary: "#064e3b",
      accent: "#34d399",
      background: "#022c22",
      surface: "#065f46",
      text: "#f0fdf4",
      textMuted: "#86efac",
      border: "#047857",
    },
  },
  sunset: {
    name: "Sunset",
    colors: {
      primary: "#f59e0b",
      secondary: "#78350f",
      accent: "#fbbf24",
      background: "#451a03",
      surface: "#92400e",
      text: "#fffbeb",
      textMuted: "#fde68a",
      border: "#b45309",
    },
  },
  lavender: {
    name: "Lavender",
    colors: {
      primary: "#a855f7",
      secondary: "#581c87",
      accent: "#c084fc",
      background: "#3b0764",
      surface: "#6b21a8",
      text: "#faf5ff",
      textMuted: "#e9d5ff",
      border: "#7e22ce",
    },
  },
  monochrome: {
    name: "Monochrome",
    colors: {
      primary: "#ffffff",
      secondary: "#404040",
      accent: "#d4d4d4",
      background: "#0a0a0a",
      surface: "#262626",
      text: "#fafafa",
      textMuted: "#a3a3a3",
      border: "#525252",
    },
  },
}

export interface TemplateConfig {
  id: TemplateType
  name: string
  description: string
  preview: string
  features: string[]
}

export const templates: Record<TemplateType, TemplateConfig> = {
  minimal: {
    id: "minimal",
    name: "Minimal Developer",
    description: "Clean typography-focused design for developers who let their work speak",
    preview: "Minimal layout with generous whitespace and subtle accents",
    features: [
      "Typography-focused design",
      "Generous whitespace",
      "Subtle hover effects",
      "List-based project display",
      "Inline skill badges",
      "Minimalist navigation",
    ],
  },
  creative: {
    id: "creative",
    name: "Creative Designer",
    description: "Bold and artistic with asymmetric layouts and vibrant colors",
    preview: "Asymmetric layout with bold colors and creative sections",
    features: [
      "Asymmetric grid layout",
      "Bold color blocks",
      "Large project showcases",
      "Animated skill displays",
      "Creative section dividers",
      "Eye-catching typography",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional Resume",
    description: "Corporate and polished with structured sections and formal typography",
    preview: "Structured layout with formal typography and professional color scheme",
    features: [
      "Formal typography",
      "Structured sections",
      "Professional color palette",
      "Detailed project cards",
      "Experience timeline",
      "Resume-style layout",
    ],
  },
  student: {
    id: "student",
    name: "Student Portfolio",
    description: "Fresh and energetic design perfect for students and early career",
    preview: "Energetic layout with vibrant colors and modern design",
    features: [
      "Fresh, modern design",
      "Vibrant color accents",
      "Project-focused layout",
      "Skill progression display",
      "Social media integration",
      "Mobile-first approach",
    ],
  },
}
