// src/app/features/customer-detail/customer-detail.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './customer-detail.html',
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);

  // 1. Estraiamo lo slug reattivamente dalla rotta
  private readonly slug$ = this.route.paramMap.pipe(
    filter(params => params.has('slug'))
  );

  // 2. Chiamata HTTP automatica e trasformazione in Signal
  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );
}