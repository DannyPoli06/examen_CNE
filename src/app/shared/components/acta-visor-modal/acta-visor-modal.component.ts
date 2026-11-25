import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  documentTextOutline,
  personOutline,
} from 'ionicons/icons';

import {
  ActaElectoral,
  EstadoRegistroActa,
} from '../../../core/models/electoral.models';
import { ActasService } from '../../../core/services/actas';
import { GpsBadgeComponent } from '../gps-badge/gps-badge.component';

@Component({
  selector: 'app-acta-visor-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonBadge,
    IonNote,
    IonSpinner,
    GpsBadgeComponent,
  ],
  templateUrl: './acta-visor-modal.component.html',
  styleUrls: ['./acta-visor-modal.component.scss'],
})
export class ActaVisorModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly actasService = inject(ActasService);

  @Input({ required: true }) acta!: ActaElectoral;
  @Input() puedeValidar = true;

  observacion = '';
  readonly guardando = signal<boolean>(false);
  readonly errorMensaje = signal<string>('');

  constructor() {
    addIcons({
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      documentTextOutline,
      personOutline,
    });
  }

  ngOnInit(): void {
    this.observacion = this.acta?.observacion ?? '';
  }

  async cerrar(actualizada = false): Promise<void> {
    await this.modalCtrl.dismiss({ actualizada });
  }

  async cambiarEstado(nuevoEstado: EstadoRegistroActa): Promise<void> {
    this.errorMensaje.set('');

    if (nuevoEstado === 'Observada' && !this.observacion.trim()) {
      this.errorMensaje.set(
        'Ingresa el motivo de la observación antes de marcar el acta como Observada.'
      );
      return;
    }

    this.guardando.set(true);
    try {
      await this.actasService.actualizarEstadoActa(
        this.acta,
        nuevoEstado,
        this.observacion
      );
      this.acta = {
        ...this.acta,
        estado: nuevoEstado,
        observacion: this.observacion.trim(),
      };
      await this.cerrar(true);
    } catch (error) {
      this.errorMensaje.set(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado del acta.'
      );
    } finally {
      this.guardando.set(false);
    }
  }
}