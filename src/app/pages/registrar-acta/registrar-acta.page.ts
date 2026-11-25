import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { collection, getDocs } from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cameraOutline,
  checkmarkCircleOutline,
  cloudUploadOutline,
  imagesOutline,
  locateOutline,
  sendOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  ActaElectoral,
  DignidadElectoral,
  JrvMesa,
  ListaCandidato,
  UbicacionGps,
  VotoPorLista,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { CamaraService } from '../../core/services/camara';
import { GeoService } from '../../core/services/geo';
import { JrvService } from '../../core/services/jrv';
import { SyncOfflineService } from '../../core/services/sync-offline';
import { SessionStore } from '../../core/state/session.store';
import { evaluarCuadreActa } from '../../core/validators/acta';
import { GpsBadgeComponent } from '../../shared/components/gps-badge/gps-badge.component';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

interface FilaVotoLista {
  listaID: string;
  listaPerteneciente: string;
  siglas: string;
  nombrePartido: string;
  candidato: string;
  votos: number;
}

@Component({
  selector: 'app-registrar-acta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonIcon,
    IonBadge,
    IonCheckbox,
    IonNote,
    IonSpinner,
    GpsBadgeComponent,
    UiStateBannerComponent,
  ],
  templateUrl: './registrar-acta.page.html',
  styleUrls: ['./registrar-acta.page.scss'],
})
export class RegistrarActaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  private readonly jrvService = inject(JrvService);
  private readonly actasService = inject(ActasService);
  private readonly camaraService = inject(CamaraService);
  private readonly geoService = inject(GeoService);
  private readonly syncOfflineService = inject(SyncOfflineService);

  readonly cargandoInicial = signal<boolean>(true);
  readonly enviando = signal<boolean>(false);
  readonly capturandoGps = signal<boolean>(false);
  readonly capturandoFoto = signal<boolean>(false);

  readonly jrv = signal<JrvMesa | null>(null);
  readonly actaPrevia = signal<ActaElectoral | null>(null);
  readonly filasListas = signal<FilaVotoLista[]>([]);
  readonly catalogoTotal = signal<ListaCandidato[]>([]);

  readonly dignidad = signal<DignidadElectoral>('Alcalde');
  readonly nitidezConfirmada = signal<boolean>(false);

  votosBlancos = 0;
  votosNulos = 0;
  totalSufragantes = 0;
  observacionManual = '';

  readonly gpsActual = signal<UbicacionGps | null>(null);
  readonly fotoDataUrl = signal<string>('');
  readonly fotoUrlExistente = signal<string>('');
  readonly errorMensaje = signal<string>('');

  readonly sumaVotosListas = computed(() =>
    this.filasListas().reduce((acc, item) => acc + (Number(item.votos) || 0), 0)
  );

  constructor() {
    addIcons({
      cameraOutline,
      imagesOutline,
      locateOutline,
      sendOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      cloudUploadOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const jrvID = this.route.snapshot.paramMap.get('jrvID');
    if (!jrvID) {
      this.errorMensaje.set('No se especificó la Junta Receptora del Voto.');
      this.cargandoInicial.set(false);
      return;
    }

    try {
      const mesa =
        this.sessionStore.jrvAsignada()?.ID === jrvID
          ? this.sessionStore.jrvAsignada()
          : await this.jrvService.obtenerJrvPorId(jrvID);

      this.jrv.set(mesa);

      const listasSnap = await getDocs(collection(firestoreDb, 'listas'));
      const todasListas: ListaCandidato[] = listasSnap.docs
        .map((d) => d.data() as ListaCandidato)
        .sort((a, b) => a.listaPerteneciente.localeCompare(b.listaPerteneciente));

      this.catalogoTotal.set(todasListas);

      await this.cargarActaPorDignidad(this.dignidad());

      if (!this.gpsActual()) {
        await this.obtenerGps();
      }
    } catch (error) {
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'Error al cargar datos del acta.'
      );
    } finally {
      this.cargandoInicial.set(false);
    }
  }

  async cambiarDignidad(valor: unknown): Promise<void> {
    if (valor !== 'Alcalde' && valor !== 'Prefecto') return;
    const nuevaDignidad: DignidadElectoral = valor;
    if (this.dignidad() === nuevaDignidad) return;
    this.dignidad.set(nuevaDignidad);
    this.cargandoInicial.set(true);
    try {
      await this.cargarActaPorDignidad(nuevaDignidad);
    } finally {
      this.cargandoInicial.set(false);
    }
  }

  private async cargarActaPorDignidad(dignidad: DignidadElectoral): Promise<void> {
    const mesa = this.jrv();
    if (!mesa) return;

    const listas = this.catalogoTotal().filter(
      (l) => !l.dignidad || l.dignidad === dignidad
    );

    const actaID = `ACTA-${mesa.ID}-${dignidad}`;
    const actaExistente = await this.actasService.obtenerActaPorId(actaID);

    if (actaExistente) {
      this.actaPrevia.set(actaExistente);
      this.votosBlancos = actaExistente.votosBlancos;
      this.votosNulos = actaExistente.votosNulos;
      this.totalSufragantes = actaExistente.totalSufragantes;
      this.gpsActual.set(actaExistente.gps);
      this.fotoUrlExistente.set(actaExistente.fotoUrl);
      this.fotoDataUrl.set('');
      this.nitidezConfirmada.set(true);
    } else {
      this.actaPrevia.set(null);
      this.votosBlancos = 0;
      this.votosNulos = 0;
      this.totalSufragantes = 0;
      this.fotoDataUrl.set('');
      this.fotoUrlExistente.set('');
      this.nitidezConfirmada.set(false);
    }

    const filas: FilaVotoLista[] = listas.map((l) => {
      const previo = actaExistente?.votosPorLista.find((v) => v.listaID === l.ID);
      return {
        listaID: l.ID,
        listaPerteneciente: l.listaPerteneciente,
        siglas: l.siglas,
        nombrePartido: l.nombrePartido,
        candidato: l.candidato,
        votos: previo ? previo.votos : 0,
      };
    });

    this.filasListas.set(filas);
  }

  actualizarVotoLista(listaID: string, valor: unknown): void {
    const numero = Math.max(0, Math.floor(Number(valor) || 0));
    this.filasListas.update((actual) =>
      actual.map((f) => (f.listaID === listaID ? { ...f, votos: numero } : f))
    );
  }

  obtenerEvaluacionCuadre() {
    const mesa = this.jrv();
    const votosPorLista: VotoPorLista[] = this.filasListas().map((f) => ({
      listaID: f.listaID,
      listaPerteneciente: f.listaPerteneciente,
      siglas: f.siglas,
      votos: Number(f.votos) || 0,
    }));

    return evaluarCuadreActa({
      votosPorLista,
      votosBlancos: Number(this.votosBlancos) || 0,
      votosNulos: Number(this.votosNulos) || 0,
      totalSufragantes: Number(this.totalSufragantes) || 0,
      electoresHabilitadosJrv: mesa?.electores ?? 0,
    });
  }

  async obtenerGps(): Promise<void> {
    this.capturandoGps.set(true);
    this.errorMensaje.set('');
    try {
      const coords = await this.geoService.obtenerUbicacionActual();
      this.gpsActual.set(coords);
    } catch (error) {
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'No se pudo obtener la ubicación GPS.'
      );
    } finally {
      this.capturandoGps.set(false);
    }
  }

  async tomarFoto(usarGaleria = false): Promise<void> {
    this.capturandoFoto.set(true);
    this.errorMensaje.set('');
    try {
      const foto = await this.camaraService.capturarFotoActa(usarGaleria);
      this.fotoDataUrl.set(foto.dataUrl);
      this.fotoUrlExistente.set('');
      this.nitidezConfirmada.set(false);
    } catch (error) {
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'No se pudo capturar la imagen.'
      );
    } finally {
      this.capturandoFoto.set(false);
    }
  }

  async enviarActa(): Promise<void> {
    this.errorMensaje.set('');
    const mesa = this.jrv();
    const veedor = this.sessionStore.perfil();
    const gps = this.gpsActual();

    if (!mesa || !veedor) {
      this.errorMensaje.set('Faltan datos de la sesión o de la mesa asignada.');
      return;
    }

    if (!gps) {
      this.errorMensaje.set('Debes capturar la ubicación GPS antes de enviar el acta.');
      return;
    }

    if (!this.fotoDataUrl() && !this.fotoUrlExistente()) {
      this.errorMensaje.set('Debes capturar la fotografía del acta física.');
      return;
    }

    if (!this.nitidezConfirmada()) {
      this.errorMensaje.set(
        'Debes verificar y confirmar que la fotografía es nítida y legible antes de transmitir.'
      );
      return;
    }

    if ((Number(this.totalSufragantes) || 0) <= 0) {
      this.errorMensaje.set('Ingresa el total de sufragantes que consta en el acta.');
      return;
    }

    const votosPorLista: VotoPorLista[] = this.filasListas().map((f) => ({
      listaID: f.listaID,
      listaPerteneciente: f.listaPerteneciente,
      siglas: f.siglas,
      votos: Math.max(0, Math.floor(Number(f.votos) || 0)),
    }));

    this.enviando.set(true);
    try {
      await this.syncOfflineService.enviarOEncolarActa({
        jrv: mesa,
        veedor,
        dignidad: this.dignidad(),
        votosPorLista,
        votosBlancos: Math.max(0, Math.floor(Number(this.votosBlancos) || 0)),
        votosNulos: Math.max(0, Math.floor(Number(this.votosNulos) || 0)),
        totalSufragantes: Math.max(0, Math.floor(Number(this.totalSufragantes) || 0)),
        gps,
        ...(this.fotoDataUrl() ? { fotoDataUrl: this.fotoDataUrl() } : {}),
        ...(this.fotoUrlExistente() ? { fotoUrlExistente: this.fotoUrlExistente() } : {}),
        ...(this.observacionManual.trim()
          ? { observacionManual: this.observacionManual.trim() }
          : {}),
      });

      await this.router.navigateByUrl('/tabs/mis-mesas', { replaceUrl: true });
    } catch (error) {
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'Ocurrió un error al registrar el acta.'
      );
    } finally {
      this.enviando.set(false);
    }
  }
}