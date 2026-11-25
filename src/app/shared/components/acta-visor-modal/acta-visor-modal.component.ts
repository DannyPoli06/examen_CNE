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
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { doc, updateDoc } from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  documentTextOutline,
  personOutline,
  saveOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../../core/config/backend-clients';
import {
  ActaElectoral,
  EstadoMesa,
  EstadoRegistroActa,
  VotoPorLista,
} from '../../../core/models/electoral.models';
import { ActasService } from '../../../core/services/actas';
import { JrvService } from '../../../core/services/jrv';
import { evaluarCuadreActa } from '../../../core/validators/acta';
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
  private readonly jrvService = inject(JrvService);

  @Input({ required: true }) acta!: ActaElectoral;
  @Input() puedeValidar = true;

  observacion = '';
  readonly guardando = signal<boolean>(false);
  readonly errorMensaje = signal<string>('');

  // Modo edicion para coordinadores
  readonly modoEdicion = signal<boolean>(false);
  editVotosBlancos = 0;
  editVotosNulos = 0;
  editSufragantes = 0;
  votosEditados: { [listaID: string]: number } = {};

  constructor() {
    addIcons({
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      documentTextOutline,
      personOutline,
      createOutline,
      saveOutline,
    });
  }

  ngOnInit(): void {
    this.observacion = this.acta?.observacion ?? '';
    this.cargarDatosEdicion();
  }

  private cargarDatosEdicion(): void {
    if (!this.acta) return;
    this.editVotosBlancos = this.acta.votosBlancos;
    this.editVotosNulos = this.acta.votosNulos;
    this.editSufragantes = this.acta.totalSufragantes;
    this.votosEditados = {};
    for (const v of this.acta.votosPorLista || []) {
      this.votosEditados[v.listaID] = v.votos;
    }
  }

  alternarModoEdicion(): void {
    this.errorMensaje.set('');
    if (!this.modoEdicion()) {
      this.cargarDatosEdicion();
      this.modoEdicion.set(true);
    } else {
      this.modoEdicion.set(false);
    }
  }

  async guardarCorrecciones(): Promise<void> {
    if (!this.acta.ID) return;
    this.errorMensaje.set('');
    this.guardando.set(true);

    try {
      const mesa = await this.jrvService.obtenerJrvPorId(this.acta.jrvID);
      const electores = mesa?.electores || 350;

      const votosPorListaActualizados: VotoPorLista[] = (this.acta.votosPorLista || []).map((item) => ({
        ...item,
        votos: Math.max(0, Math.floor(Number(this.votosEditados[item.listaID]) || 0)),
      }));

      const cuadre = evaluarCuadreActa({
        votosPorLista: votosPorListaActualizados,
        votosBlancos: Math.max(0, Math.floor(Number(this.editVotosBlancos) || 0)),
        votosNulos: Math.max(0, Math.floor(Number(this.editVotosNulos) || 0)),
        totalSufragantes: Math.max(0, Math.floor(Number(this.editSufragantes) || 0)),
        electoresHabilitadosJrv: electores,
      });

      const cambios: Partial<ActaElectoral> = {
        votosPorLista: votosPorListaActualizados,
        votosBlancos: Math.max(0, Math.floor(Number(this.editVotosBlancos) || 0)),
        votosNulos: Math.max(0, Math.floor(Number(this.editVotosNulos) || 0)),
        totalSufragantes: Math.max(0, Math.floor(Number(this.editSufragantes) || 0)),
        totalCalculado: cuadre.totalCalculado,
        estado: cuadre.estadoSugerido,
        observacion: cuadre.observacion || this.observacion.trim(),
      };

      await updateDoc(doc(firestoreDb, 'actas', this.acta.ID), cambios);

      const nuevoEstadoJrv: EstadoMesa = cuadre.estadoSugerido === 'Validada' ? 'Registrada' : 'Observada';
      await this.jrvService.actualizarEstadoJrv(this.acta.jrvID, nuevoEstadoJrv, this.acta.ID);

      this.acta = {
        ...this.acta,
        ...cambios,
      };

      this.modoEdicion.set(false);
    } catch (err) {
      this.errorMensaje.set(err instanceof Error ? err.message : 'Error al guardar correcciones.');
    } finally {
      this.guardando.set(false);
    }
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