import type { PipelineStage } from '@/types'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/utils'

// Custom, user-defined kanban stages for an org's hiring pipeline.
// Dual-mode: Supabase when configured, in-memory otherwise. Failure-tolerant —
// if the table doesn't exist yet (migration 0010 not run), getStages returns [].

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
let mockStages: PipelineStage[] = []

function mapStage(r: Row): PipelineStage {
  return { id: r.id, organizationId: r.organization_id, name: r.name, position: r.position ?? 0, createdAt: r.created_at }
}

export const pipelineService = {
  async getStages(orgId: string): Promise<PipelineStage[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('organization_id', orgId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) {
        console.warn('[pipeline] getStages failed (run migration 0010?):', error.message)
        return []
      }
      return (data ?? []).map(mapStage)
    }
    return mockStages.filter(s => s.organizationId === orgId)
  },

  async createStage(orgId: string, name: string, position: number): Promise<PipelineStage> {
    if (supabase) {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert({ organization_id: orgId, name: name.trim(), position })
        .select()
        .single()
      if (error) {
        console.error('[pipeline] createStage failed:', error)
        throw new Error(error.message || 'Could not add stage — is migration 0010/0011 applied?')
      }
      return mapStage(data)
    }
    const stage: PipelineStage = { id: generateId(), organizationId: orgId, name: name.trim(), position, createdAt: new Date().toISOString() }
    mockStages = [...mockStages, stage]
    return stage
  },

  async deleteStage(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
      if (error) throw error
      return
    }
    mockStages = mockStages.filter(s => s.id !== id)
  },
}
