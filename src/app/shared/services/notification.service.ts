// src/app/core/services/notification.service.ts
import { Injectable, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Segnale che contiene la coda delle notifiche attive
  readonly queue = signal<Notification[]>([]);

  show(message: string, type: NotificationType = 'info', duration = 5000) {
    const id = uuidv4();
    const newNote: Notification = { id, type, message, duration };

    this.queue.update(q => [...q, newNote]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  // Metodi shorthand per comodità
  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 8000); } // Errori più persistenti
  warning(msg: string) { this.show(msg, 'warning'); }
  info(msg: string) { this.show(msg, 'info'); }

  remove(id: string) {
    this.queue.update(q => q.filter(n => n.id !== id));
  }
}