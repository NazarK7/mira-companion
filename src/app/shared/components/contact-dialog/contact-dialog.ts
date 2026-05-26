// src/app/shared/components/contact-dialog/contact-dialog.ts
import { ChangeDetectionStrategy, Component, ElementRef, viewChild, signal, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';
import { AppButtonComponent } from '../button/button.component';

export interface ContactData {
  id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppButtonComponent],
  template: `
    <dialog #dialogElement class="m-auto rounded-2xl border border-border-subtle bg-bg-surface p-0 shadow-2xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm open:flex open:flex-col max-w-md w-[calc(100%-2rem)] focus:outline-none">
      <div class="p-6 border-b border-border-subtle">
        <h2 class="text-xl font-bold text-text-primary uppercase italic tracking-tighter">
          {{ isEdit() ? 'Edit Contact' : 'New Contact' }}
        </h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSave()" class="p-6 space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-black uppercase text-text-tertiary tracking-widest">Name *</label>
          <input formControlName="name" class="bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-text-primary focus:border-primary-500 outline-none transition-all placeholder:text-text-disabled" placeholder="John Doe" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-black uppercase text-text-tertiary tracking-widest">Role</label>
          <input formControlName="role" class="bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-text-primary focus:border-primary-500 outline-none transition-all" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-black uppercase text-text-tertiary tracking-widest">Email</label>
          <input formControlName="email" type="email" class="bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-text-primary focus:border-primary-500 outline-none transition-all" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-black uppercase text-text-tertiary tracking-widest">Phone</label>
          <input formControlName="phone" class="bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-text-primary focus:border-primary-500 outline-none transition-all" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <app-button variant="ghost" type="button" (clicked)="onCancel()">{{ i18n.t().common.cancel }}</app-button>
          <app-button variant="primary" type="submit" [disabled]="form.invalid">{{ i18n.t().common.save }}</app-button>
        </div>
      </form>
    </dialog>
  `,
  host: { 'class': 'contents' }
})
export class ContactDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogElement');
  
  isEdit = signal(false);
  form = this.fb.group({
    name: ['', Validators.required],
    role: [''],
    email: ['', [Validators.email]],
    phone: ['']
  });

  private resolveFn?: (value: ContactData | null) => void;

  /**
   * Apre il dialog e restituisce una Promise con i dati o null se annullato.
   */
  open(contact?: ContactData): Promise<ContactData | null> {
    this.isEdit.set(!!contact);
    // Reset del form con i dati esistenti o vuoto
    this.form.reset(contact || { name: '', role: '', email: '', phone: '' });
    
    this.dialogRef().nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  protected onSave() {
    if (this.form.invalid) return;
    this.close(this.form.getRawValue());
  }

  protected onCancel() {
    this.close(null);
  }

  private close(result: ContactData | null) {
    this.dialogRef().nativeElement.close();
    this.resolveFn?.(result);
  }
}