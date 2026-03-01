# Explore Page Cards Redesign

## Overview
Simplified the repository cards on the Explore page to show only essential information with a cleaner, more professional design.

## Changes Made

### 1. Simplified RepoCard Component
**File:** `components/dashboard/repo-card.tsx`

**Removed:**
- Match score badge
- Match reason explanation
- Stars and forks count
- Verbose descriptions

**Kept (as requested):**
- Repository name (owner/repo)
- Description (2-line clamp)
- GitHub link button
- Website link button (if available)
- Tech stack badges (language + tags)
- Good first issues count
- "Read More" button (opens repository details modal)

### 2. Updated Card Design

**Layout:**
```
┌─────────────────────────────────────────┐
│ owner/repo              [GitHub] [Web]  │
│ Description text here...                │
│                                         │
│ [Language] [Tag1] [Tag2] [Tag3]        │
│ ─────────────────────────────────────  │
│ X good first issues      [Read More]   │
└─────────────────────────────────────────┘
```

**Features:**
- Clean header with name and action buttons
- Concise description (2 lines max)
- Tech stack badges with language color indicator
- Footer with good first issues and read more button
- Hover effects with primary color accent
- Better spacing and visual hierarchy

### 3. Updated Explore Page
**File:** `app/dashboard/explore/page.tsx`

**Changes:**
- Added homepage URLs for all repositories
- Removed match score and match reason data
- Simplified repository data structure
- Updated description text
- Maintained good first issues fetching

**Added Homepage Links:**
- React → https://react.dev
- Deno → https://deno.com
- shadcn-ui → https://ui.shadcn.com
- TensorFlow → https://www.tensorflow.org
- Prisma → https://www.prisma.io
- Flutter → https://flutter.dev
- Astro → https://astro.build
- Hugging Face → https://huggingface.co

### 4. Updated Dashboard Page
**File:** `app/dashboard/page.tsx`

**Changes:**
- Updated all RepoCard usages to match new props
- Removed matchScore and matchReason props
- Added proper prop mapping for discovered repos
- Maintained all three tabs (All, Beginner Friendly, Most Active)

## Benefits

1. **Cleaner Design**: Less visual clutter, easier to scan
2. **Better UX**: Quick access to GitHub and website links
3. **Focused Information**: Only shows what users need to decide
4. **Professional Look**: Modern card design with proper spacing
5. **Consistent**: Same card design across dashboard and explore pages

## User Flow

1. User sees repository card with essential info
2. Can click GitHub icon to view repository
3. Can click Globe icon to visit project website
4. Can click "Read More" to open detailed modal with:
   - Full repository analysis
   - Issues list with filters
   - Contributors
   - Tech stack details
   - And more...

## Technical Details

### Props Interface
```typescript
interface RepoCardProps {
  name: string              // Repository name
  owner: string             // Repository owner
  description?: string      // Short description
  language: string          // Primary language
  languageColor: string     // Language badge color
  tags: string[]           // Tech stack tags
  goodFirstIssues?: number // Count of beginner issues
  homepage?: string        // Project website URL
  onCardClick?: Function   // Modal trigger
}
```

### Styling
- Border: `border-border` with hover `border-primary/30`
- Background: `bg-card` with hover shadow
- Spacing: Consistent padding and gaps
- Typography: Clear hierarchy with proper sizes
- Colors: Uses theme colors for consistency

## Future Enhancements

Potential improvements:
- Add filtering by language/tags
- Add sorting options (stars, issues, activity)
- Add bookmark/favorite functionality
- Add "View Issues" quick link
- Add last updated timestamp
- Add contributor count
