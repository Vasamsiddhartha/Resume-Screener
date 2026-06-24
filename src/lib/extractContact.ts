// Best-effort extraction of a candidate's name + email from raw resume text.
// Email is reliable (regex). Name is hard because extracted resume text is often a
// single blob with no line breaks — so we read the LEADING words before the first
// "contact marker" (emoji / email / phone / links), then fall back to a line scan,
// then to the email local-part. Always returns editable suggestions — never throws.

export interface ExtractedContact {
  name?: string
  email?: string
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

// Section headers / contact labels that are never a person's name.
const NON_NAME = /^(resume|curriculum|vitae|cv|profile|summary|objective|contact|address|phone|mobile|email|e-?mail|linkedin|github|portfolio|experience|education|skills|projects)$/i

// Common job-title words — so we don't pick a title line/word as the name.
const ROLE_WORDS = /engineer|developer|manager|analyst|designer|consultant|officer|specialist|intern|associate|lead|director|architect|administrator|executive|scientist|accountant|nurse|teacher|coordinator|technician|representative/i

// Marker that ends the name region: a line break, an emoji/symbol (📍📧📞✉☎ …),
// a pipe/bullet, a URL, "linkedin/github", an "@" (email), or a phone-ish digit run.
const CONTACT_MARKER =
  /[\n\r|•·]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]|https?:\/\/|www\.|linked\s?in|github|@|\(?\+?\d/iu

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
}

function nameFromEmail(email: string): string | undefined {
  const local = email.split('@')[0]
  const parts = local.split(/[._\-+]+/).filter(p => /^[a-zA-Z]{2,}$/.test(p))
  if (parts.length >= 2) return titleCase(parts.slice(0, 3).join(' '))
  return undefined
}

// Take the leading words of the document, up to the first contact marker, and
// keep the run of name-like words. Handles "Aditya Roshan 📍 Dubai …" blobs.
function leadingName(text: string): string | undefined {
  let head = text.replace(/^﻿/, '')
  // Drop a leading document header label, e.g. "RESUME — " / "Curriculum Vitae:".
  head = head.replace(/^\s*(resume|curriculum\s+vitae|c\.?v\.?|profile|bio[\s-]?data)\s*[:\-–]?\s*/i, '')
  const markerIdx = head.search(CONTACT_MARKER)
  if (markerIdx > 0) head = head.slice(0, markerIdx)
  // Keep letters/spaces/.'- only (strips stray symbols), collapse whitespace.
  head = head.replace(/[^\p{L}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!head) return undefined

  const nameWords: string[] = []
  for (const w of head.split(' ')) {
    if (nameWords.length >= 4) break
    if (NON_NAME.test(w) || ROLE_WORDS.test(w)) break
    // A name token: starts with a letter, alphabetic (+ . ' -).
    if (/^[A-Za-z][A-Za-z.'-]*$/.test(w)) nameWords.push(w)
    else break
  }
  const name = nameWords.join(' ').trim()
  return name.length >= 2 ? titleCase(name) : undefined
}

// Per-line scan — for resumes where the name sits on its own line after a header.
function looksLikeName(line: string): boolean {
  const t = line.trim().replace(/[,|].*$/, '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 40) return false
  if (/[@\d]/.test(t)) return false
  const words = t.split(' ')
  if (words.length < 2 || words.length > 4) return false
  if (words.some(w => NON_NAME.test(w) || ROLE_WORDS.test(w))) return false
  return words.every(w => /^[A-Za-z][A-Za-z.'-]*$/.test(w))
}

export function extractContact(text: string): ExtractedContact {
  const result: ExtractedContact = {}
  if (!text) return result

  const email = text.match(EMAIL_RE)?.[0]
  if (email) result.email = email.toLowerCase()

  // 1) Leading words before the first contact marker (best for single-line blobs).
  let name = leadingName(text)

  // 2) Otherwise scan the first lines for a name-looking line.
  if (!name) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (const line of lines.slice(0, 15)) {
      if (looksLikeName(line)) { name = titleCase(line.replace(/[,|].*$/, '').trim()); break }
    }
  }

  // 3) Last resort: derive from the email local-part (jane.doe@ -> Jane Doe).
  if (!name && result.email) name = nameFromEmail(result.email)

  if (name) result.name = name
  return result
}
