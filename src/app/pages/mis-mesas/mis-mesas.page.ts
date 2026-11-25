import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  businessOutline,
  cameraOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';

import { ActaElectoral } from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { SessionStore } from '../../core/state/session.store';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

@Component({
  selector: 'app-mis-mesas',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    UiStateBannerComponent,
  ],
  templateUrl: './mis-mesas.page.html',
  styleUrls: ['./mis-mesas.page.scss'],
})
export class MisMesasPage {
  private readonly router = inject(Router);
  private readonly actasService = inject(ActasService);
  readonly sessionStore = inject(SessionStore);

  readonly perfil = this.sessionStore.perfil;
  readonly recinto = this.sessionStore.recintoAsignado;
  readonly jrv = this.sessionStore.jrvAsignada;

  readonly actaAlcalde = signal<ActaElectoral | null>(null);
  readonly actaPrefecto = signal<ActaElectoral | null>(null);
  readonly cargandoActa = signal<boolean>(false);

  constructor() {
    addIcons({
      businessOutline,
      documentTextOutline,
      cameraOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      timeOutline,
      peopleOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargarEstadoActa();
  }

  async refrescar(event: CustomEvent): Promise<void> {
    const usuario = this.perfil();
    if (usuario) {
      await this.sessionStore.cargarContextoOperativo(
        usuario.recintoID,
        usuario.jrvID
      );
    }
    await this.cargarEstadoActa();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async cargarEstadoActa(): Promise<void> {
    const mesa = this.jrv();
    if (!mesa) {
      this.actaAlcalde.set(null);
      this.actaPrefecto.set(null);
      return;
    }

    this.cargandoActa.set(true);
    try {
      const [alc, pref, legacy] = await Promise.all([
        this.actasService.obtenerActaPorId(`ACTA-${mesa.ID}-Alcalde`),
        this.actasService.obtenerActaPorId(`ACTA-${mesa.ID}-Prefecto`),
        this.actasService.obtenerActaPorId(`ACTA-${mesa.ID}`),
      ]);
      this.actaAlcalde.set(alc || legacy);
      this.actaPrefecto.set(pref);
    } catch (error) {
      console.error('Error al consultar actas de la mesa:', error);
    } finally {
      this.cargandoActa.set(false);
    }
  }

  async irARegistrarActa(): Promise<void> {
    const mesa = this.jrv();
    if (!mesa) return;
    await this.router.navigate(['/tabs/registrar-acta', mesa.ID]);
  }

  estadoVisualDignidad(acta: ActaElectoral | null) {
    if (!acta) {
      return { texto: 'Pendiente de Registro', color: 'warning' };
    }
    switch (acta.estado) {
      case 'Validada':
        return { texto: 'Acta Validada', color: 'success' };
      case 'Observada':
        return { texto: 'Acta Observada', color: 'danger' };
      default:
        return { texto: 'Transmitida', color: 'primary' };
    }
  }
}