// src/app/core/services/i18n.service.ts
import { Injectable, computed, signal } from '@angular/core';

export type Lang = 'it' | 'en';

const DICTIONARY = {
  it: {
    common: {
      confirm: 'Conferma',
      cancel: 'Annulla',
      save: 'Salva',
      delete: 'Elimina',
      close: 'Chiudi',
      loading: 'Caricamento...',
      noData: 'Nessun dato disponibile',
      customers: 'Clienti',
      editCustomer: 'Modifica Cliente',
      newCustomer: 'Nuovo Cliente',
      createCustomer: 'Crea Cliente',
      saveCustomer: 'Salva Cliente',
      addContact: 'Aggiungi Contatto',
      dashBoard_archive: 'Archivio installazioni MiRa_3D e Cognex',
    },
    actions: {
      success: 'Operazione completata',
      error: 'Si è verificato un errore',
      warning: 'Attenzione',
      info: 'Informazione'
    }
  },
  en: {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
      noData: 'No data available',
      customers: 'Customers',
      editCustomer: 'Edit Customer',
      newCustomer: 'New Customer',
      createCustomer: 'Create Customer',
      saveCustomer: 'Save Customer',
      addContact: 'Add Contact',
      dashBoard_archive: 'MiRa_3D and Cognex Installations Archive',
    },
    actions: {
      success: 'Operation completed',
      error: 'An error occurred',
      warning: 'Warning',
      info: 'Information'
    }
  }
} as const;

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>('it');
  readonly t = computed(() => DICTIONARY[this.lang()]);

  setLang(newLang: Lang) {
    this.lang.set(newLang);
  }
}