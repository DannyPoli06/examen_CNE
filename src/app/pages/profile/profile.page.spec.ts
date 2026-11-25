import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  cardOutline,
  checkboxOutline,
  locationOutline,
  logOutOutline,
  mailOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/services/autenticacion';
import { SessionStore } from '../../core/state/session.store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButton,
    IonAvatar,
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly sessionStore = inject(SessionStore);

  readonly perfil = this.sessionStore.perfil;
  readonly recinto = this.sessionStore.recintoAsignado;
  readonly jrv = this.sessionStore.jrvAsignada;

  readonly etiquetaRol = computed(() => {
    switch (this.perfil()?.rol) {
      case 'CoordProvincial':
        return 'Coordinador Provincial';
      case 'CoordRecinto':
        return 'Coordinador de Recinto';
      case 'Veedor':
        return 'Veedor Electoral';
      default:
        return 'Usuario Electoral';
    }
  });

  readonly iniciales = computed(() => {
    const nombres = this.perfil()?.nombres?.trim() ?? 'CN';
    return nombres
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    addIcons({
      personOutline,
      cardOutline,
      mailOutline,
      shieldCheckmarkOutline,
      businessOutline,
      locationOutline,
      checkboxOutline,
      logOutOutline,
    });
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.salir();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}