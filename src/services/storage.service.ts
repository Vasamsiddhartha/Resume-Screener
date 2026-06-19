import { supabase } from '@/lib/supabase'

// Resume storage, isolated per organization (#7).
// Files live in the private `resumes` bucket under:
//     {organizationId}/{candidateId}/{timestamp}-{filename}
// Storage RLS (see supabase/migrations/0002_storage.sql) ensures a user can only
// touch files whose first path segment is an org they're a member of.

const BUCKET = 'resumes'

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export const storageService = {
  /** Whether Supabase storage is available (credentials configured). */
  isEnabled(): boolean {
    return !!supabase
  },

  /** Upload a resume file; returns the stored path to save on the candidate. */
  async uploadResume(organizationId: string, candidateId: string, file: File): Promise<string> {
    if (!supabase) throw new Error('Supabase is not configured')
    const path = `${organizationId}/${candidateId}/${Date.now()}-${sanitize(file.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    if (error) throw error
    return path
  },

  /** Create a short-lived signed URL to view/download a stored resume. */
  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (!supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
    if (error) throw error
    return data.signedUrl
  },

  /** Remove a stored resume (no-op when Supabase isn't configured). */
  async deleteResume(path: string): Promise<void> {
    if (!supabase) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  },

  /** List the resume files stored for an organization. */
  async listOrgResumes(organizationId: string): Promise<string[]> {
    if (!supabase) return []
    const { data, error } = await supabase.storage.from(BUCKET).list(organizationId, { limit: 1000 })
    if (error) throw error
    return (data ?? []).map(f => `${organizationId}/${f.name}`)
  },
}
