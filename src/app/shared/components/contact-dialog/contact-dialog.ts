// src/app/shared/components/contact-dialog/contact-dialog.ts
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './contact-dialog.html'
})
export class ContactDialogComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly data = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ContactDialogComponent>);

  readonly isEdit = !!this.data?.contact;

  readonly form = this.fb.group({
    id: [''], 
    name: ['', Validators.required],
    role: [''],
    email: [''],
    phone: ['']
  });

  ngOnInit() {
    if (this.isEdit) {
      this.form.patchValue(this.data.contact);
    }
  }

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.getRawValue());
    }
  }
}