// src/app/app.config.ts
import { 
  ApplicationConfig, 
  provideZonelessChangeDetection, // Paradigma Angular 21 [cite: 1]
  provideBrowserGlobalErrorListeners 
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { globalInterceptor } from './shared/services/global.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Attivazione modalità Zoneless (rimuove la dipendenza da Zone.js) 
    provideZonelessChangeDetection(), 

    provideBrowserGlobalErrorListeners(),

    // 2. Router potenziato con binding dei parametri e transizioni fluide [cite: 1]
    provideRouter(
      routes,
      withComponentInputBinding(), 
      withViewTransitions()
    ),

    // 3. Client HTTP con interceptor globale per Loading & Error Handling
    provideHttpClient(
      withFetch(),
      withInterceptors([globalInterceptor])
    )
  ]
};