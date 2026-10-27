import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, ProjectSummary } from '@/types/project';
import { normalizeProject, sequenceDuration } from '@/model/project';
import { LIMITS } from '@/config/limits';
import type { ProjectRepository } from './repository';

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  aspect: string;
  duration_seconds: number;
  clip_count: number;
  data: Project;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase-backed repository. Only project metadata + timeline JSON is
 * stored. Media never goes here. RLS (see supabase/migrations) ensures a
 * user can only read/write their own rows.
 */
export class CloudRepository implements ProjectRepository {
  readonly kind = 'cloud' as const;

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list(): Promise<ProjectSummary[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('id,name,aspect,duration_seconds,clip_count,created_at,updated_at')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as Omit<ProjectRow, 'data' | 'user_id'>[]).map((r) => ({
      id: r.id,
      name: r.name,
      aspect: r.aspect as ProjectSummary['aspect'],
      durationSeconds: Number(r.duration_seconds) || 0,
      clipCount: r.clip_count ?? 0,
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: new Date(r.updated_at).getTime(),
    }));
  }

  async get(id: string): Promise<Project | null> {
    const { data, error } = await this.client.from('projects').select('data,updated_at').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as Pick<ProjectRow, 'data' | 'updated_at'>;
    const project = normalizeProject(row.data);
    // Trust the server timestamp as the source of truth for conflict checks.
    project.updatedAt = Math.max(project.updatedAt, new Date(row.updated_at).getTime());
    return project;
  }

  async save(project: Project): Promise<void> {
    const json = JSON.stringify(project);
    if (json.length > LIMITS.maxProjectJsonBytes) {
      throw new Error('Project is too large to save to the cloud.');
    }
    const { error } = await this.client.from('projects').upsert(
      {
        id: project.id,
        user_id: this.userId,
        name: project.name,
        aspect: project.settings.aspect,
        duration_seconds: sequenceDuration(project.clips),
        clip_count: project.clips.length,
        data: project,
        updated_at: new Date(project.updatedAt).toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw new Error(error.message);
  }

  async rename(id: string, name: string): Promise<void> {
    const project = await this.get(id);
    if (!project) return;
    await this.save({ ...project, name, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
