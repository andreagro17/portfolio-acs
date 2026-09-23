import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly menuOpen = signal(false);

  protected readonly links: readonly NavLink[] = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Proyectos', href: '#proyectos' },
    { label: 'Sobre mí', href: '#sobre-mi' },
    { label: 'Contacto', href: '#contacto' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
