import { Routes } from '@angular/router';


export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Dashboard — MiRa Companion',
  },

  {
    path: 'calibration-sandbox',
    loadComponent: () =>
      import('./features/calibration-sandbox/calibration-sandbox').then(
        m => m.CalibrationSandboxComponent,
      ),
    title: 'Calibration Sandbox — MiRa Companion',
  },

  {
    path: 'calibration-wizard',
    loadComponent: () =>
      import('./features/calibration-wizard/calibration-wizard').then(
        m => m.CalibrationWizardComponent,
      ),
    title: 'Calibration Wizard — MiRa Companion',
  },

  // ─── Archive routes (nested) ─────────────────────────────────────────────
  // /customers
  {
    path: 'customers',
    loadComponent: () =>
      import('./features/customer-list/customer-list').then(m => m.CustomerListComponent),
    title: 'Customers — MiRa Companion',
  },

   {
    path: 'customers/new',
    loadComponent: () =>
      import('./features/customer-detail/customer-detail').then(m => m.CustomerDetailComponent),
    data: { mode: 'create' },
    title: 'New Customer — MiRa Companion',
  },
  // /customers/:slug
  {
    path: 'customers/:slug',
    loadComponent: () =>
      import('./features/customer-detail/customer-detail').then(m => m.CustomerDetailComponent),
    title: 'Customer — MiRa Companion',
  }, 

  // /customers/:slug/plants/new
  {
    path: 'customers/:slug/plants/new',
    loadComponent: () =>
      import('./features/plant-detail/plant-detail').then(m => m.PlantDetailComponent),
    data: { mode: 'create' },
    title: 'New Plant — MiRa Companion',
  },
  // /customers/:slug/plants/:plantId
  {
    path: 'customers/:slug/plants/:plantId',
    loadComponent: () =>
      import('./features/plant-detail/plant-detail').then(m => m.PlantDetailComponent),
    title: 'Plant — MiRa Companion',
  },

  // /customers/:slug/plants/:plantId/stations/new
  {
    path: 'customers/:slug/plants/:plantId/stations/new',
    loadComponent: () =>
      import('./features/station-detail/station-detail').then(m => m.StationDetailComponent),
    data: { mode: 'create' },
    title: 'New Station — MiRa Companion',
  },
  // /customers/:slug/plants/:plantId/stations/:stationId
  {
    path: 'customers/:slug/plants/:plantId/stations/:stationId',
    loadComponent: () =>
      import('./features/station-detail/station-detail').then(m => m.StationDetailComponent),
    title: 'Station — MiRa Companion',
  },

  // /customers/:slug/plants/:plantId/stations/:stationId/cameras/new
/*   {
    path: 'customers/:slug/plants/:plantId/stations/:stationId/cameras/new',
    loadComponent: () =>
      import('./features/camera-detail/camera-detail').then(m => m.CameraDetailComponent),
    data: { mode: 'create' },
    title: 'New Camera — MiRa Companion',
  },
  // /customers/:slug/plants/:plantId/stations/:stationId/cameras/:cameraId
  {
    path: 'customers/:slug/plants/:plantId/stations/:stationId/cameras/:cameraId',
    loadComponent: () =>
      import('./features/camera-detail/camera-detail').then(m => m.CameraDetailComponent),
    title: 'Camera — MiRa Companion',
  },  */

  // ─── Placeholder (Fase futura) ───────────────────────────────────────────
  {
    path: 'calculators',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Calculators — MiRa Companion',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    title: 'Settings — MiRa Companion',
  },

  { path: '**', redirectTo: 'dashboard' },
];