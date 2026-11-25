import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  eyeOffOutline,
  eyeOutline,
  keyOutline,
  lockClosedOutline,
  logInOutline,
  mailOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { UsuarioPerfil } from '../../core/models/electoral.models';
import { AuthService } from '../../core/services/autenticacion';
import { validarCedulaEcuador } from '../../core/validators/cedula';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonNote,
    IonSpinner,
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  cedula = '';
  clave = '';

  nuevaClave = '';
  confirmarClave = '';

  recuperacionInput = '';

  readonly cargando = signal<boolean>(false);
  readonly errorMensaje = signal<string>('');
  readonly exitoMensaje = signal<string>('');
  readonly vistaActual = signal<'login' | 'cambioClave' | 'recuperar'>('login');
  readonly perfilPendienteClave = signal<UsuarioPerfil | null>(null);
  readonly mostrarClave = signal<boolean>(false);
  readonly mostrarNuevaClave = signal<boolean>(false);

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      personOutline,
      lockClosedOutline,
      logInOutline,
      keyOutline,
      mailOutline,
      arrowBackOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  cambiarVista(vista: 'login' | 'cambioClave' | 'recuperar'): void {
    this.errorMensaje.set('');
    this.exitoMensaje.set('');
    this.vistaActual.set(vista);
  }

  alternarVisibilidadClave(): void {
    this.mostrarClave.update((v) => !v);
  }

  alternarVisibilidadNuevaClave(): void {
    this.mostrarNuevaClave.update((v) => !v);
  }

  async iniciarSesion(): Promise<void> {
    this.errorMensaje.set('');
    const cedulaLimpia = this.cedula.trim();

    if (!validarCedulaEcuador(cedulaLimpia)) {
      this.errorMensaje.set('Ingresa una cédula ecuatoriana válida (10 dígitos).');
      return;
    }

    if (!this.clave || this.clave.length < 6) {
      this.errorMensaje.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.cargando.set(true);
    try {
      const perfil = await this.authService.iniciarSesionConCedula(
        cedulaLimpia,
        this.clave
      );

      if (perfil.primeraVezAcceso) {
        this.perfilPendienteClave.set(perfil);
        this.cambiarVista('cambioClave');
        return;
      }

      await this.redirigirSegunRol(perfil);
    } catch (error) {
      this.errorMensaje.set(this.mapearErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarNuevaClave(): Promise<void> {
    this.errorMensaje.set('');

    if (this.nuevaClave.length < 6) {
      this.errorMensaje.set('La nueva contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    if (this.nuevaClave === 'Ecuador2026' || this.nuevaClave === this.cedula.trim()) {
      this.errorMensaje.set('Debes elegir una contraseña distinta a la clave inicial.');
      return;
    }

    if (this.nuevaClave !== this.confirmarClave) {
      this.errorMensaje.set('Las contraseñas no coinciden.');
      return;
    }

    this.cargando.set(true);
    try {
      await this.authService.cambiarClaveInicial(this.nuevaClave);
      const perfil = this.authService.perfilElectoral();
      if (perfil) {
        await this.redirigirSegunRol(perfil);
      }
    } catch (error) {
      this.errorMensaje.set(this.mapearErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async enviarRecuperacion(): Promise<void> {
    this.errorMensaje.set('');
    this.exitoMensaje.set('');

    if (!this.recuperacionInput.trim()) {
      this.errorMensaje.set('Ingresa tu correo registrado o tu número de cédula.');
      return;
    }

    this.cargando.set(true);
    try {
      const correoEnviado = await this.authService.enviarRecuperacionPorCorreo(
        this.recuperacionInput
      );
      this.exitoMensaje.set(
        `Se envió un enlace de recuperación a ${correoEnviado}. Revisa tu bandeja o spam.`
      );
    } catch (error) {
      this.errorMensaje.set(this.mapearErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async redirigirSegunRol(perfil: UsuarioPerfil): Promise<void> {
    switch (perfil.rol) {
      case 'CoordProvincial':
        await this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
        break;
      case 'CoordRecinto':
        await this.router.navigateByUrl('/tabs/mesas', { replaceUrl: true });
        break;
      case 'Veedor':
      default:
        await this.router.navigateByUrl('/tabs/mis-mesas', { replaceUrl: true });
        break;
    }
  }

  private mapearErrorAuth(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    switch (code) {
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Cédula o contraseña incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu acceso a internet.';
      default:
        return error instanceof Error && error.message
          ? error.message
          : 'Ocurrió un error inesperado al autenticar.';
    }
  }
}