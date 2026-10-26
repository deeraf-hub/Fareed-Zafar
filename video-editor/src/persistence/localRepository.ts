import type { Project, ProjectSummary } from '@/types/project';
import { normalizeProject, summarize } from '@/model/project';
import { LIMITS } from '@/config/limits';
import { localDb } from './localDb';
import type { ProjectRepository } from './repository';

export class LocalRepository implements ProjectRepository {
  readonly kind = 'local' as const;

  async list(): Promise<ProjectSummary[]> {
    const rows = await localDb.listProjects();
    return rows.map((r) => summarize(r.data));
  }

  async get(id: string): Promise<Project | null> {
    const row = await localDb.getProject(id);
    return row ? normalizeProject(row.data) : null;
  }

  async save(project: Project): Promise<void> {
    const json = JSON.stringify(project);
    if (json.length > LIMITS.maxProjectJsonBytes) {
      throw new Error('Project is too large to save. Remove unused media from the library.');
    }
    const existing = await localDb.listProjects();
    if (!existing.some((p) => p.id === project.id) && existing.length >= LIMITS.maxLocalProjects) {
      throw new Error(`Local project limit (${LIMITS.maxLocalProjects}) reached. Delete an old project first.`);
    }
    await localDb.putProject(project, { dirty: false });
  }

  async rename(id: string, name: string): Promise<void> {
    const row = await localDb.getProject(id);
    if (!row) return;
    await localDb.putProject({ ...row.data, name, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    const row = await localDb.getProject(id);
    await localDb.deleteProject(id);
    // Remove media blobs no other local project references.
    if (row) {
      const others = await localDb.listProjects();
      const stillUsed = new Set(others.flatMap((p) => p.data.assets.map((a) => a.id)));
      for (const asset of row.data.assets) {
        if (!stillUsed.has(asset.id)) await localDb.deleteMedia(asset.id);
      }
    }
  }
}

export const localRepository = new LocalRepository();
