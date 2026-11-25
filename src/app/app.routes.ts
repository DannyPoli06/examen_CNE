import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'recintos',
    loadComponent: () => import('./pages/recintos/recintos.page').then((m) => m.RecintosPage),
  },
  {
    path: 'mesas',
    loadComponent: () => import('./pages/mesas/mesas.page').then((m) => m.MesasPage),
  },
  {
    path: 'mis-mesas',
    loadComponent: () => import('./pages/mis-mesas/mis-mesas.page').then((m) => m.MisMesasPage),
  },
  {
    path: 'registrar-acta',
    loadComponent: () => import('./pages/registrar-acta/registrar-acta.page').then((m) => m.RegistrarActaPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
  },
];
