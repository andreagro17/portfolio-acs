import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

/*
 * ThemeService centraliza el tema de la app (claro / oscuro).
 *
 * - Guarda la preferencia en localStorage para recordarla entre visitas.
 * - Respeta la preferencia del sistema en la primera carga.
 * - Aplica el atributo data-theme en <html>, del que cuelgan las
 *   variables CSS definidas en styles.scss.
 * - Es seguro en SSR: solo toca window/document/localStorage en navegador.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'portfolio-theme';

  readonly theme = signal<Theme>('light');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const saved = localStorage.getItem(this.storageKey) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme.set(saved ?? (prefersDark ? 'dark' : 'light'));

    // Cada vez que cambia el tema, lo reflejamos en el DOM y lo guardamos.
    effect(() => {
      const value = this.theme();
      document.documentElement.setAttribute('data-theme', value);
      localStorage.setItem(this.storageKey, value);
    });
  }

  toggle(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }
}
