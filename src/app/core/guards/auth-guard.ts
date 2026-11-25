import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { RolSistema, UsuarioPerfil } from '../models/electoral.models';
import { AuthService } from '../services/autenticacion';

function rutaDestinoPorRol(router: Router, perfil: UsuarioPerfil): UrlTree {
  if (perfil.primeraVezAcceso) {
    return router.createUrlTree(['/login']);
  }

  switch (perfil.rol) {
    case 'CoordProvincial':
      return router.createUrlTree(['/tabs/dashboard']);
    case 'CoordRecinto':
      return router.createUrlTree(['/tabs/mesas']);
    case 'Veedor':
    default:
      return router.createUrlTree(['/tabs/mis-mesas']);
  }
}

export const guardAutenticado: CanActivateFn = async (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const perfil = await authService.esperarSesionLista();

  if (!perfil) {
    return router.createUrlTree(['/login']);
  }

  if (perfil.primeraVezAcceso) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

export function guardRolPermitido(rolesPermitidos: RolSistema[]): CanActivateFn {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const perfil = await authService.esperarSesionLista();

    if (!perfil) {
      return router.createUrlTree(['/login']);
    }

    if (perfil.primeraVezAcceso) {
      return router.createUrlTree(['/login']);
    }

    if (!rolesPermitidos.includes(perfil.rol)) {
      return rutaDestinoPorRol(router, perfil);
    }

    return true;
  };
}

export const guardInvitado: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const perfil = await authService.esperarSesionLista();

  if (perfil) {
    return rutaDestinoPorRol(router, perfil);
  }

  return true;
};