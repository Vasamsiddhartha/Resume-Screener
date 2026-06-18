// Browser-side DOCX text extraction using mammoth (browser build).
//
// Loaded via dynamic import() from the upload step, so mammoth is
// code-split into its own chunk and never ships in the initial bundle.
// The .docx is parsed entirely in the browser — only extracted text
// is ever sent onward.

import mammoth from 'mammoth/mammoth.browser'

/**
 * Extracts plain text from a .docx File.
 * Returns a trimmed string. Only modern .docx (Office Open XML) is
 * supported — legacy binary .doc cannot be read in the browser.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return (result?.value ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
