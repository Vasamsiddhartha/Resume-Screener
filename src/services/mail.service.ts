// Email sending — NO Supabase Edge Functions (per project constraint).
//
// Two paths, picked automatically from env:
//   1) VITE_MAIL_API_URL  → POST { to, subject, html } to your own backend.
//      (RECOMMENDED — keeps OAuth secrets server-side.)
//   2) Gmail OAuth2 direct from the browser, using your refresh/access tokens.
//      ⚠️ These env vars ship in the client bundle, so anyone can read them.
//      Fine for a private/demo build; use path (1) for anything public.
//
// Everything is guarded: if nothing is configured, send() is a no-op.

const MAIL_API_URL = import.meta.env.VITE_MAIL_API_URL ?? ''
const MAIL_FROM = import.meta.env.VITE_MAIL_FROM ?? ''
// Sender display name (the "From" name recipients see). Defaults to ATS Scanner.
const MAIL_FROM_NAME = import.meta.env.VITE_MAIL_FROM_NAME ?? 'ATS Scanner'

// EmailJS — works from the browser (CORS-friendly), no backend needed.
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? ''
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? ''
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? ''

const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID ?? ''
const GMAIL_CLIENT_SECRET = import.meta.env.VITE_GMAIL_CLIENT_SECRET ?? ''
const GMAIL_REFRESH_TOKEN = import.meta.env.VITE_GMAIL_REFRESH_TOKEN ?? ''
let gmailAccessToken = import.meta.env.VITE_GMAIL_ACCESS_TOKEN ?? ''

export interface MailMessage {
  to: string
  subject: string
  html: string
}

const emailjsReady = Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY)
const gmailReady = Boolean(gmailAccessToken || (GMAIL_REFRESH_TOKEN && GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET))

// Gmail OAuth direct from the browser cannot reliably send: Google's token
// endpoint blocks browser requests (no CORS), so access-token refresh fails.
if (gmailReady && !MAIL_API_URL && !emailjsReady) {
  console.warn(
    '[Mail] Gmail OAuth tokens are set, but Gmail cannot send from the browser ' +
    '(token refresh is blocked by CORS). Use EmailJS (VITE_EMAILJS_*) or a backend ' +
    '(VITE_MAIL_API_URL) instead.'
  )
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  bytes.forEach(b => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildRfc822({ to, subject, html }: MailMessage): string {
  return [
    `From: ${MAIL_FROM ? `${MAIL_FROM_NAME} <${MAIL_FROM.replace(/.*<|>.*/g, '')}>` : MAIL_FROM_NAME}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n')
}

// Exchange the long-lived refresh token for a fresh access token.
async function refreshGmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || 'Gmail token refresh failed')
  gmailAccessToken = data.access_token
  return gmailAccessToken
}

async function sendViaGmail(msg: MailMessage): Promise<void> {
  const raw = toBase64Url(buildRfc822(msg))
  const endpoint = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

  let token = gmailAccessToken || (await refreshGmailAccessToken())
  let res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  })

  // Access token expired → refresh once and retry
  if (res.status === 401 && GMAIL_REFRESH_TOKEN) {
    token = await refreshGmailAccessToken()
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    })
  }
  if (!res.ok) throw new Error(`Gmail send failed (${res.status})`)
}

async function sendViaApi(msg: MailMessage): Promise<void> {
  const res = await fetch(MAIL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, ...msg }),
  })
  if (!res.ok) throw new Error(`Mail API failed (${res.status})`)
}

// EmailJS REST API — sends from the browser. The template (configured in the
// EmailJS dashboard) should use these variables: to_email, subject, message, from_name.
async function sendViaEmailJS(msg: MailMessage): Promise<void> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: msg.to,
        subject: msg.subject,
        message: msg.html,
        from_name: MAIL_FROM_NAME,
      },
    }),
  })
  if (!res.ok) throw new Error(`EmailJS failed (${res.status}: ${await res.text().catch(() => '')})`)
}

export const mailService = {
  isEnabled(): boolean {
    return Boolean(MAIL_API_URL) || emailjsReady || gmailReady
  },

  /** Send an email. No-op (logged) when nothing is configured or on failure —
   *  email delivery must never break the app flow. Order: backend → EmailJS → Gmail. */
  async send(msg: MailMessage): Promise<boolean> {
    if (!this.isEnabled()) return false
    try {
      if (MAIL_API_URL) await sendViaApi(msg)
      else if (emailjsReady) await sendViaEmailJS(msg)
      else await sendViaGmail(msg)
      return true
    } catch (err) {
      console.warn('[Mail] send failed:', err instanceof Error ? err.message : err)
      return false
    }
  },
}
