import type { Project, ProjectSummary } from '@/types/project';

/**
 * Storage abstraction. `LocalRepository` (IndexedDB) is always available;
 * `CloudRepository` (Supabase) is used when the user is signed in. The
 * editor talks only to this interface.
 */
export interface ProjectRepository {
  readonly kind: 'local' | 'cloud';
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  delete(id: string): Promise<void>;
}
