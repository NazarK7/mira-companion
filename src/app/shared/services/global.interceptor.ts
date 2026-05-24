// src/app/shared/services/global.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';

export const globalInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const notify = inject(NotificationService);

  // Attiva l'overlay di caricamento
  loading.show();

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Errore di connessione al server';
      
      if (error.status === 0) {
        message = 'Il backend NestJS non risponde. Verifica Docker (Porta 5433).';
      } else if (error.error?.message) {
        message = error.error.message;
      }

      notify.error(message);
      return throwError(() => error);
    }),
    finalize(() => {
      // Disattiva l'overlay a fine chiamata (successo o errore)
      loading.hide();
    })
  );
};