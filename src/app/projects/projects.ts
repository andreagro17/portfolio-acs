import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PROJECTS } from '../config/projects.config';
import { Project } from '../models/project.model';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  private readonly projects: Project[] = PROJECTS;

  // Lista de filtros: "Todos" + tecnologías únicas ordenadas.
  protected readonly tags: string[] = [
    'Todos',
    ...Array.from(new Set(this.projects.flatMap((project) => project.tags))).sort(),
  ];

  protected readonly activeTag = signal('Todos');

  protected readonly filtered = computed<Project[]>(() => {
    const tag = this.activeTag();
    return tag === 'Todos'
      ? this.projects
      : this.projects.filter((project) => project.tags.includes(tag));
  });

  protected selectTag(tag: string): void {
    this.activeTag.set(tag);
  }
}
