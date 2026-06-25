import { useAuthStore } from '@/store/auth.store'

// The org segment in the URL is the organization NAME slug (e.g. /green-land/jobs)
// instead of a literal "org". It is cosmetic — the active organization is driven by
// the auth store, not resolved from the slug — so it never needs to be unique.

export function slugifyOrg(name?: string | null): string {
  const s = (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return s || 'org'
}

/** Base path for the current org, e.g. "/green-land". Use as `${base}/jobs`. */
export function useOrgBase(): string {
  const name = useAuthStore(s => s.user?.organizationName)
  return '/' + slugifyOrg(name)
}
