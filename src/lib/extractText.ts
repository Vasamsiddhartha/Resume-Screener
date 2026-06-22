// Extract plain text from an uploaded resume/CV/cover-letter file.
// Lazy-loads the PDF/DOCX parsers so they stay out of the initial bundle.
export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')

  try {
    if (isPdf) {
      const { extractTextFromPdf } = await import('@/lib/pdf')
      return await extractTextFromPdf(file)
    }
    if (isDocx) {
      const { extractTextFromDocx } = await import('@/lib/docx')
      return await extractTextFromDocx(file)
    }
    return await file.text()
  } catch {
    return ''
  }
}
