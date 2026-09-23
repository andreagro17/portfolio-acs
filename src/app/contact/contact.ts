import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly fb = inject(FormBuilder);

  protected readonly sent = signal(false);

  protected readonly info = {
    email: 'andreagro17@gmail.com',
    phone: '+34 660 110 684',
    location: 'Madrid, España',
    linkedin: 'https://www.linkedin.com/in/andrea-castro-b55133125/',
  };

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, message } = this.form.getRawValue();
    const subject = encodeURIComponent(`Contacto de ${name}`);
    const body = encodeURIComponent(`${message}\n\n${name} (${email})`);
    // Abrimos el cliente de correo con el mensaje ya redactado
    window.location.href = `mailto:${this.info.email}?subject=${subject}&body=${body}`;
    this.sent.set(true);
  }
}
