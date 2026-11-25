import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { RolSistema, UsuarioPerfil } from '../models/electoral.models';
import { AuthService } from '../services/autenticacion';

function rutaDestinoPorRol(router: Router, perfil: UsuarioPerfil): UrlTree {
  if (perfil.primeraVezAcceso) {
    return router.createUrlTree(['/cambiar-clave']);
  }

  switch (perfil.rol) {
    case 'CoordProvincial':
      return router.createUrlTree(['/provincial']);
    case 'CoordRecinto':
      return router.createUrlTree(['/recinto']);
    case 'Veedor':
    default:
      return router.createUrlTree(['/veedor']);
  }
}

export const guardAutenticado: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const perfil = await authService.esperarSesionLista();

  if (!perfil) {
    return router.createUrlTree(['/login']);
  }

  // Si es su primer ingreso, solo puede estar en /cambiar-clave
  if (perfil.primeraVezAcceso && state.url !== '/cambiar-clave') {
    return router.createUrlTree(['/cambiar-clave']);
  }

  // Si ya cambió su clave, no debe volver a entrar a /cambiar-clave
  if (!perfil.primeraVezAcceso && state.url === '/cambiar-clave') {
    return rutaDestinoPorRol(router, perfil);
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
      return router.createUrlTree(['/cambiar-clave']);
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