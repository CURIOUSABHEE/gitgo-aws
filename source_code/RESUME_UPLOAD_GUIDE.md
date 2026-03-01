# Resume Upload Guide

## Supported Format
- **PDF only** (text-based, not scanned images)
- **Maximum size**: 5MB
- **Text-based**: Must contain selectable text, not just images

## Common Issues

### 1. "Could not extract text from the PDF"
**Cause**: Your PDF is image-based (scanned document) or doesn't contain extractable text.

**Solutions**:
- Use a text-based PDF (created from Word, Google Docs, LaTeX, etc.)
- If you have a scanned PDF, convert it using OCR software:
  - Adobe Acrobat (paid)
  - Google Drive (free - upload PDF, open with Google Docs, download as PDF)
  - Online OCR tools like ocr.space or onlineocr.net
- Export your resume directly as PDF from your word processor

### 2. "Failed to read PDF file"
**Cause**: PDF is corrupted, password-protected, or in an unsupported format.

**Solutions**:
- Remove password protection
- Re-export the PDF from the original source
- Try opening and re-saving the PDF in a PDF viewer

### 3. "File too large"
**Cause**: PDF exceeds 5MB limit.

**Solutions**:
- Compress the PDF using online tools
- Remove unnecessary images or reduce image quality
- Use a PDF compressor like Smallpdf or iLovePDF

## Best Practices

### For Best Results:
1. **Use a standard resume format** with clear sections
2. **Include clear section headers**: Skills, Experience, Education, Projects
3. **Use bullet points** for easy parsing
4. **Avoid complex layouts**: Multi-column layouts may cause parsing issues
5. **Keep it simple**: Plain text formats work best

### Recommended Sections:
- Career Objective / Summary
- Skills (grouped by category)
- Work Experience
- Education
- Projects (with technologies used)

### What Gets Extracted:
- ✅ Career objective/summary
- ✅ Skills (automatically grouped by category)
- ✅ Work experience (title, company, duration, description)
- ✅ Education (institution, degree, year, details)
- ✅ Projects (name, description, technologies, duration)
- ❌ Contact information (excluded for privacy)

## Testing Your PDF

Before uploading, verify your PDF:
1. Open it in a PDF viewer
2. Try to select and copy text
3. If you can't select text, it's an image-based PDF

## Alternative: Manual Entry

If you continue to have issues with PDF upload:
1. Use the manual profile editing features
2. Add skills, experience, and projects directly in the settings
3. Connect your GitHub account for automatic project detection

## Technical Details

### How It Works:
1. **Text Extraction**: Uses pdf-parse library to extract text
2. **AI Parsing**: Sends text to Groq AI (Llama 3.3 70B) for intelligent parsing
3. **Structured Data**: Returns organized data in JSON format
4. **GitHub Matching**: Automatically matches projects with your GitHub repos

### Privacy:
- Resume data is stored securely in MongoDB
- Never shared with third parties
- Used only for matching with open source projects
- You can delete your resume data anytime

## Support

If you continue to experience issues:
1. Check that your PDF meets all requirements
2. Try a different PDF export method
3. Use manual profile entry as an alternative
4. Contact support with the specific error message
