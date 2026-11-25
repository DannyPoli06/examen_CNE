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
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { doc, updateDoc } from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cameraOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  documentTextOutline,
  imagesOutline,
  personOutline,
  saveOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../../core/config/backend-clients';
import {
  ActaElectoral,
  DignidadElectoral,
  EstadoMesa,
  EstadoRegistroActa,
  VotoPorLista,
} from '../../../core/models/electoral.models';
import { ActasService } from '../../../core/services/actas';
import { CamaraService } from '../../../core/services/camara';
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
    IonSegment,
    IonSegmentButton,
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
  private readonly camaraService = inject(CamaraService);

  @Input({ required: true }) acta!: ActaElectoral;
  @Input() puedeValidar = true;

  observacion = '';
  readonly guardando = signal<boolean>(false);
  readonly capturandoFoto = signal<boolean>(false);
  readonly nuevaFotoDataUrl = signal<string>('');
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
      cameraOutline,
      imagesOutline,
    });
  }

  ngOnInit(): void {
    this.observacion = this.acta?.observacion ?? '';
    this.cargarDatosEdicion();
  }

  async cambiarDignidadVisor(valor: unknown): Promise<void> {
    if (valor !== 'Alcalde' && valor !== 'Prefecto') return;
    const dignidad: DignidadElectoral = valor;
    if ((this.acta.dignidad || 'Alcalde') === dignidad) return;

    this.errorMensaje.set('');
    this.guardando.set(true);
    try {
      const otraActa = await this.actasService.obtenerActaPorId(
        `ACTA-${this.acta.jrvID}-${dignidad}`
      );
      if (!otraActa) {
        this.errorMensaje.set(`Aún no se ha registrado el acta de ${dignidad} en esta JRV.`);
        return;
      }
      this.acta = otraActa;
      this.observacion = otraActa.observacion ?? '';
      this.modoEdicion.set(false);
      this.cargarDatosEdicion();
    } finally {
      this.guardando.set(false);
    }
  }

  private cargarDatosEdicion(): void {
    if (!this.acta) return;
    this.editVotosBlancos = this.acta.votosBlancos;
    this.editVotosNulos = this.acta.votosNulos;
    this.editSufragantes = this.acta.totalSufragantes;
    this.nuevaFotoDataUrl.set('');
    this.votosEditados = {};
    for (const v of this.acta.votosPorLista || []) {
      this.votosEditados[v.listaID] = v.votos;
    }
  }

  async cambiarFotoActa(usarGaleria = false): Promise<void> {
    this.errorMensaje.set('');
    this.capturandoFoto.set(true);
    try {
      const foto = await this.camaraService.capturarFotoActa(usarGaleria);
      if (!foto.nitida) {
        this.errorMensaje.set(
          `Fotografía descartada por baja nitidez (índice ${foto.indiceEnfoque} / mínimo ${foto.minimoRequerido}).`
        );
        return;
      }
      this.nuevaFotoDataUrl.set(foto.dataUrl);
    } catch (e) {
      this.errorMensaje.set(e instanceof Error ? e.message : 'No se pudo capturar la nueva foto.');
    } finally {
      this.capturandoFoto.set(false);
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
    const actaID = this.acta.ID || `ACTA-${this.acta.jrvID}-${this.acta.dignidad || 'Alcalde'}`;
    this.errorMensaje.set('');
    this.guardando.set(true);

    try {
      const mesa = await this.jrvService.obtenerJrvPorId(this.acta.jrvID);
      const electores = mesa?.electores || 350;

      let fotoUrlFinal = this.acta.fotoUrl;
      if (this.nuevaFotoDataUrl()) {
        fotoUrlFinal = await this.camaraService.subirFotoActa(
          this.nuevaFotoDataUrl(),
          this.acta.recintoID,
          `${this.acta.jrvID}_${this.acta.dignidad || 'Alcalde'}_corr`
        );
      }

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
        ID: actaID,
        dignidad: this.acta.dignidad || 'Alcalde',
        fotoUrl: fotoUrlFinal,
        votosPorLista: votosPorListaActualizados,
        votosBlancos: Math.max(0, Math.floor(Number(this.editVotosBlancos) || 0)),
        votosNulos: Math.max(0, Math.floor(Number(this.editVotosNulos) || 0)),
        totalSufragantes: Math.max(0, Math.floor(Number(this.editSufragantes) || 0)),
        totalCalculado: cuadre.totalCalculado,
        estado: cuadre.estadoSugerido,
        observacion: cuadre.observacion || this.observacion.trim(),
      };

      await updateDoc(doc(firestoreDb, 'actas', actaID), cambios);

      const nuevoEstadoJrv: EstadoMesa = cuadre.estadoSugerido === 'Validada' ? 'Registrada' : 'Observada';
      await this.jrvService.actualizarEstadoJrv(this.acta.jrvID, nuevoEstadoJrv, actaID);

      this.acta = {
        ...this.acta,
        ...cambios,
      };

      this.nuevaFotoDataUrl.set('');
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