# Architecture Diagram Download Feature

## Overview
Added the ability to download architecture diagrams as PNG or SVG images.

## Changes Made

### 1. Installed Dependencies
```bash
npm install html-to-image
```

### 2. Updated ArchitectureDiagram Component
**File:** `components/ArchitectureDiagram.tsx`

**New Features:**
- Added download buttons for PNG and SVG formats
- Integrated `html-to-image` library for image export
- Added `repoName` prop to customize downloaded filename
- Download buttons appear in the diagram header

**Download Options:**
- **PNG**: High-quality raster image (2x pixel ratio for retina displays)
- **SVG**: Vector format for scalability

**Filename Format:**
- `{repoName}-diagram.png` or `{repoName}-diagram.svg`
- Falls back to `architecture-diagram.png` if no repo name provided

### 3. Updated ResultsDashboard
**File:** `components/ResultsDashboard.tsx`

- Passed `metadata?.name` as `repoName` prop to ArchitectureDiagram
- Enables automatic filename generation based on repository name

## Usage

### For Users
1. Analyze a repository
2. Scroll to the Architecture Diagram section
3. Click "PNG" or "SVG" button in the diagram header
4. Image downloads automatically with repository name

### For Developers
```tsx
<ArchitectureDiagram 
  data={architectureJson} 
  repoName="my-repo" 
/>
```

## Technical Details

### Export Process
1. Captures the React Flow viewport element
2. Converts to PNG (with 2x pixel ratio) or SVG
3. Creates download link with proper filename
4. Triggers browser download

### Image Quality
- **PNG**: 2x pixel ratio for high-DPI displays
- **Background**: Dark theme (#0b1120) preserved
- **Quality**: Maximum quality setting (1.0)

### Error Handling
- Graceful failure with console error logging
- No UI disruption if export fails

## Benefits

1. **Documentation**: Save diagrams for technical documentation
2. **Presentations**: Use in slides and reports
3. **Sharing**: Easy to share architecture with team
4. **Archiving**: Keep snapshots of architecture evolution
5. **Offline Access**: View diagrams without running the app

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Future Enhancements

Potential improvements:
- PDF export option
- Batch download (multiple diagrams)
- Custom resolution settings
- Watermark/branding options
- Copy to clipboard functionality
