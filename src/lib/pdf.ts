// Browser-side PDF text extraction using Mozilla PDF.js (pdfjs-dist).
//
// This module is loaded via dynamic import() from the upload step, so
// pdfjs-dist is code-split into its own chunk and never ships in the
// initial bundle. The PDF is parsed entirely in the browser — only the
// extracted text is ever sent onward, so the file itself never leaves
// the user's machine.

import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a hashed URL at build time and serves the worker
// as a separate file. PDF.js runs its parsing off the main thread.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Extracts plain text from a PDF File, page by page.
 * Returns a trimmed string. An empty result means the PDF had no
 * embedded text (e.g. a scanned/image-only document) and needs OCR.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise

  const pages: string[] = []
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
      pages.push(pageText)
      page.cleanup()
    }
  } finally {
    // Always release worker resources, even if a page throws
    await loadingTask.destroy()
  }

  return pages
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
