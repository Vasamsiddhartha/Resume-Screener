// Best-effort extraction of a candidate's name + email from raw resume text.
// Email is reliable (regex). Name uses top-of-document heuristics with an
// email-derived fallback. Always returns editable suggestions — never throws.

export interface ExtractedContact {
  name?: string
  email?: string
}

// Standard email shape; good enough for resumes.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

// Lines that are clearly NOT a person's name (section headers / contact labels).
const NON_NAME = /resume|curriculum\s+vitae|\bc\.?v\.?\b|profile|summary|objective|contact|address|phone|mobile|email|e-?mail|linkedin|github|portfolio|www\.|http/i

// Common job-title words — avoids picking a title line as the name.
const ROLE_WORDS = /engineer|developer|manager|analyst|designer|consultant|officer|specialist|intern|associate|lead|director|architect|administrator|executive|scientist|accountant|nurse|teacher|coordinator|technician|representative/i

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
}

function nameFromEmail(email: string): string | undefined {
  const local = email.split('@')[0]
  const parts = local.split(/[._\-+]+/).filter(p => /^[a-zA-Z]{2,}$/.test(p))
  if (parts.length >= 2) return titleCase(parts.slice(0, 3).join(' '))
  return undefined
}

function looksLikeName(line: string): boolean {
  const t = line.trim().replace(/[,|]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 40) return false
  if (/[@\d]/.test(t)) return false          // emails / digits
  if (NON_NAME.test(t)) return false          // section headers
  if (ROLE_WORDS.test(t)) return false        // job titles
  const words = t.split(' ')
  if (words.length < 2 || words.length > 4) return false
  // Each token is alphabetic (allow ., ', -) and starts with a letter.
  return words.every(w => /^[A-Za-z][A-Za-z.'-]*$/.test(w))
}

export function extractContact(text: string): ExtractedContact {
  const result: ExtractedContact = {}
  if (!text) return result

  const email = text.match(EMAIL_RE)?.[0]
  if (email) result.email = email.toLowerCase()

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 15)) {
    if (looksLikeName(line)) {
      result.name = titleCase(line.replace(/[,|].*$/, '').trim())
      break
    }
  }

  // Fallback: derive a name from the email local-part (e.g. jane.doe@ -> Jane Doe).
  if (!result.name && result.email) {
    const derived = nameFromEmail(result.email)
    if (derived) result.name = derived
  }

  return result
}
