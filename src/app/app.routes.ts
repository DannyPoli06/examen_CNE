import { Routes } from '@angular/router';
import {
  guardAutenticado,
  guardInvitado,
  guardRolPermitido,
} from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guardInvitado],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [guardAutenticado],
    loadComponent: () =>
      import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        canActivate: [guardRolPermitido(['CoordProvincial', 'CoordRecinto'])],
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'recintos',
        canActivate: [guardRolPermitido(['CoordProvincial'])],
        loadComponent: () =>
          import('./pages/recintos/recintos.page').then((m) => m.RecintosPage),
      },
      {
        path: 'mesas',
        canActivate: [guardRolPermitido(['CoordRecinto'])],
        loadComponent: () =>
          import('./pages/mesas/mesas.page').then((m) => m.MesasPage),
      },
      {
        path: 'mis-mesas',
        canActivate: [guardRolPermitido(['Veedor'])],
        loadComponent: () =>
          import('./pages/mis-mesas/mis-mesas.page').then((m) => m.MisMesasPage),
      },
      {
        path: 'registrar-acta/:jrvID',
        canActivate: [guardRolPermitido(['Veedor'])],
        loadComponent: () =>
          import('./pages/registrar-acta/registrar-acta.page').then(
            (m) => m.RegistrarActaPage
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];