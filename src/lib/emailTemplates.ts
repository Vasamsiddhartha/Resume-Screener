// Self-contained, email-safe HTML templates (tables + inline styles).
// No external template service — we pass the full HTML to mailService.send().
// Styled to match the shared 1XL reset-password design: centered brand,
// white card with a violet accent bar, bold heading, violet CTA, link footer.

interface LayoutOpts {
  brand: string
  logoUrl?: string
  greeting?: string
  heading: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  fallbackUrl?: string
  preheader?: string
}

const ACCENT = '#7c3aed' // app theme (violet-600)
const TEXT = '#334155'
const MUTED = '#94a3b8'
const HEADING = '#0f172a'

function emailLayout(o: LayoutOpts): string {
  const year = '2026'
  const logo = o.logoUrl
    ? `<img src="${o.logoUrl}" alt="${o.brand}" height="44" style="max-height:44px;border:0;outline:none;display:block;margin:0 auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:1px;color:#b8860b;font-weight:600;">${o.brand}</div>`

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  ${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${o.preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding:16px 0 24px;">${logo}</td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <div style="height:5px;background:${ACCENT};"></div>
          <div style="padding:32px 36px;">
            ${o.greeting ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};">${o.greeting}</p>` : ''}
            <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:${HEADING};font-weight:700;">${o.heading}</h1>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${TEXT};">${o.bodyHtml}</div>
            ${o.ctaLabel && o.ctaUrl ? `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
              <td align="center" style="border-radius:10px;background:${ACCENT};">
                <a href="${o.ctaUrl}" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${o.ctaLabel}</a>
              </td>
            </tr></table>` : ''}
          </div>
        </td></tr>
        <tr><td style="padding:20px 24px;text-align:center;">
          ${o.fallbackUrl ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">If the button doesn't work, paste this link into your browser:</p>
          <a href="${o.fallbackUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${ACCENT};word-break:break-all;">${o.fallbackUrl}</a>` : ''}
          <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};">© ${year} ${o.brand}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export interface EmailContent { subject: string; html: string }

// ─── Welcome (signup) ─────────────────────────────────────────────────────────
export function welcomeEmail(o: { name: string; orgName: string; logoUrl?: string; appUrl: string }): EmailContent {
  return {
    subject: `Welcome to ${o.orgName} on ATS Scanner`,
    html: emailLayout({
      brand: o.orgName,
      logoUrl: o.logoUrl,
      greeting: `Hi ${o.name},`,
      heading: 'Your account is ready',
      preheader: `Welcome to ${o.orgName} on ATS Scanner`,
      bodyHtml: `<p style="margin:0 0 14px;">Welcome aboard! Your <strong>${o.orgName}</strong> workspace on ATS Scanner is all set up.</p>
                 <p style="margin:0;">You can start uploading resumes and running AI-powered evaluations right away.</p>`,
      ctaLabel: 'Open ATS Scanner',
      ctaUrl: o.appUrl,
      fallbackUrl: o.appUrl,
    }),
  }
}

// ─── Invite (set password) ────────────────────────────────────────────────────
export function inviteEmail(o: { orgName: string; role: 'org_admin' | 'recruiter'; acceptUrl: string; logoUrl?: string }): EmailContent {
  const roleLabel = o.role === 'org_admin' ? 'Admin' : 'Recruiter'
  return {
    subject: `You're invited to join ${o.orgName} on ATS Scanner`,
    html: emailLayout({
      brand: o.orgName,
      logoUrl: o.logoUrl,
      heading: `Join ${o.orgName}`,
      preheader: `You've been invited as ${roleLabel}`,
      bodyHtml: `<p style="margin:0 0 14px;">You've been invited to join <strong>${o.orgName}</strong> on ATS Scanner as <strong>${roleLabel}</strong>.</p>
                 <p style="margin:0;">Click the button below to set your password and access your account. This link is valid for the next 24 hours.</p>`,
      ctaLabel: 'Accept invitation and set password',
      ctaUrl: o.acceptUrl,
      fallbackUrl: o.acceptUrl,
    }),
  }
}

// ─── Evaluation completed ─────────────────────────────────────────────────────
export function evaluationEmail(o: { candidateName: string; jobTitle: string; score: number; label: string; orgName: string; logoUrl?: string; appUrl: string }): EmailContent {
  return {
    // ASCII-only subject (avoids mojibake like "Ã¢Â€Â" from em dashes in mail clients)
    subject: `ATS result: ${o.candidateName} - ${o.label} (${o.score.toFixed(1)})`,
    html: emailLayout({
      brand: o.orgName,
      logoUrl: o.logoUrl,
      heading: 'Evaluation completed',
      preheader: `${o.candidateName}: ${o.label} (${o.score.toFixed(1)})`,
      bodyHtml: `<p style="margin:0 0 16px;"><strong>${o.candidateName}</strong> has been evaluated for <strong>${o.jobTitle}</strong>.</p>
                 <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
                   <tr>
                     <td style="padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                       <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748b;">ATS Score</span>&nbsp;
                       <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#0f172a;">${o.score.toFixed(1)}</span>
                       &nbsp;&middot;&nbsp;
                       <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:${ACCENT};">${o.label}</span>
                     </td>
                   </tr>
                 </table>`,
      ctaLabel: 'View evaluations',
      ctaUrl: o.appUrl,
      fallbackUrl: o.appUrl,
    }),
  }
}
