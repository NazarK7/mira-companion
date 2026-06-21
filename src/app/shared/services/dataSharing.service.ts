import { Injectable, signal, computed, Signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataSharingService {
// Private Writable Signal - Encapsulated state inside the service
  private _cameraType = signal<string>('');

  // Public Read-Only Signal - Exposed to components to prevent direct pollution
  public readonly activeCameraType: Signal<string> = this._cameraType.asReadonly();

  // Explicit mutation interface - The only gateway to change the state
  public setCameraType(cameraType: string): void {
    if (!cameraType || cameraType.trim() === '') {
      console.warn('[DATA_SHARING_SERVICE] [VALIDATION_FAILED] Attempted to emit an empty job configuration payload.');
      return;
    }
    
    // Imperative update that triggers the reactive graph downstream
    this._cameraType.set(cameraType);
  }
}