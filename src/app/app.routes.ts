// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Dashboard — MiRa Companion',
  },

  {
    path: 'calibration-sandbox',
    loadComponent: () => import('./features/calibration-sandbox/calibration-sandbox').then(m => m.CalibrationSandboxComponent),
    title: 'Calibration Sandbox — MiRa Companion',
  },

  {
    path: 'calibration-wizard',
    loadComponent: () => import('./features/calibration-wizard/calibration-wizard').then(m => m.CalibrationWizardComponent),
    title: 'Calibration Wizard — MiRa Companion',
  },

  // ─── Archive routes (nested) ─────────────────────────────────────────────

  // 1. Lista Customers
  {
    path: 'customers',
    loadComponent: () => import('./features/customer-list/customer-list').then(m => m.CustomerListComponent),
    title: 'Customers — MiRa Companion',
  },
  // 2. Editor Customer (DEVE stare prima di :slug)
  {
    path: 'customers/new',
    loadComponent: () => import('./features/customer-editor/customer-editor').then(m => m.CustomerEditorComponent),
    title: 'New Customer — MiRa Companion',
  },
  {
    path: 'customers/:slug/edit',
    loadComponent: () => import('./features/customer-editor/customer-editor').then(m => m.CustomerEditorComponent),
    title: 'Edit Customer — MiRa Companion',
  },
  {
    path: 'customers/:slug',
    loadComponent: () => import('./features/customer-detail/customer-detail').then(m => m.CustomerDetailComponent),
    title: 'Customer — MiRa Companion',
  },
  // 3. Detail Customer
  {
    path: 'customers/:slug',
    loadComponent: () => import('./features/customer-detail/customer-detail').then(m => m.CustomerDetailComponent),
    title: 'Customer — MiRa Companion',
  },

  // --- Piante, Stazioni e Camere ---
  {
    path: 'customers/:slug/plants/new',
    loadComponent: () => import('./features/plant-editor/plant-editor').then(m => m.PlantEditorComponent),
    title: 'New Plant — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId/edit',
    loadComponent: () => import('./features/plant-editor/plant-editor').then(m => m.PlantEditorComponent),
    title: 'Edit Plant — MiRa Companion',
  },
  // PLANT DETAIL
  {
    path: 'customers/:slug/plants/:plantId',
    loadComponent: () => import('./features/plant-detail/plant-detail').then(m => m.PlantDetailComponent),
    title: 'Plant — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId',
    loadComponent: () => import('./features/plant-detail/plant-detail').then(m => m.PlantDetailComponent),
    title: 'Plant — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId/stations/new',
    loadComponent: () => import('./features/station-detail/station-detail').then(m => m.StationDetailComponent),
    data: { mode: 'create' },
    title: 'New Station — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId/stations/:stationId',
    loadComponent: () => import('./features/station-detail/station-detail').then(m => m.StationDetailComponent),
    title: 'Station — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId/stations/:stationId/cameras/new',
    loadComponent: () => import('./features/camera-details/camera-details').then(m => m.CameraDetailsComponent),
    data: { mode: 'create' },
    title: 'New Camera — MiRa Companion',
  },
  {
    path: 'customers/:slug/plants/:plantId/stations/:stationId/cameras/:cameraId',
    loadComponent: () => import('./features/camera-details/camera-details').then(m => m.CameraDetailsComponent),
    title: 'Camera — MiRa Companion',
  },

  // ─── Placeholder (Fase futura) ───────────────────────────────────────────
  {
    path: 'calculators',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Calculators — MiRa Companion',
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Settings — MiRa Companion',
  },

  { path: '**', redirectTo: 'dashboard' },
];