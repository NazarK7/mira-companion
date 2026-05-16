// src/app/core/config/api.config.ts
import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000/api', // Punta al backend NestJS
});