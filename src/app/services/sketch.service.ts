import { Injectable, signal } from '@angular/core';

/*
 * SketchService guarda si el "efecto boceto" está activo.
 *
 * Cuando está activo, los items flotantes adoptan la textura del avatar;
 * cuando no, muestran su textura original. Lo comparten el header (botón)
 * y el componente About (que aplica el material).
 */
@Injectable({ providedIn: 'root' })
export class SketchService {
  readonly enabled = signal(false);

  toggle(): void {
    this.enabled.update((value) => !value);
  }
}
