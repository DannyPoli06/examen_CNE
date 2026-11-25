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

  readonly actaActual = signal<ActaElectoral | null>(null);
  readonly cargandoActa = signal<boolean>(false);

  readonly estadoVisual = computed(() => {
    const acta = this.actaActual();
    const mesa = this.jrv();

    if (!acta && mesa?.estado === 'Pendiente') {
      return { texto: 'Pendiente de Escrutinio', color: 'warning' };
    }

    const estado = acta?.estado ?? mesa?.estado ?? 'Pendiente';
    switch (estado) {
      case 'Validada':
      case 'Registrada':
        return { texto: 'Acta Validada', color: 'success' };
      case 'Observada':
        return { texto: 'Observada - Requiere Corrección', color: 'danger' };
      default:
        return { texto: 'Pendiente de Escrutinio', color: 'warning' };
    }
  });

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
      this.actaActual.set(null);
      return;
    }

    this.cargandoActa.set(true);
    try {
      const acta = await this.actasService.obtenerActaPorId(`ACTA-${mesa.ID}`);
      this.actaActual.set(acta);
    } catch (error) {
      console.error('Error al consultar acta de la mesa:', error);
    } finally {
      this.cargandoActa.set(false);
    }
  }

  async irARegistrarActa(): Promise<void> {
    const mesa = this.jrv();
    if (!mesa) return;
    await this.router.navigate(['/tabs/registrar-acta', mesa.ID]);
  }
}