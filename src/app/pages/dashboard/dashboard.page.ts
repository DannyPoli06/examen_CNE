import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  Unsubscribe,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  pieChartOutline,
  warningOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  JrvMesa,
  ListaCandidato,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { SessionStore } from '../../core/state/session.store';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

interface ResultadoLista {
  listaID: string;
  listaPerteneciente: string;
  siglas: string;
  nombrePartido: string;
  candidato: string;
  votos: number;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonProgressBar,
    IonSpinner,
    UiStateBannerComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly sessionStore = inject(SessionStore);
  readonly actasService = inject(ActasService);

  readonly perfil = this.sessionStore.perfil;
  readonly recinto = this.sessionStore.recintoAsignado;

  readonly listasCatalogo = signal<ListaCandidato[]>([]);
  readonly totalJrvAmbito = signal<number>(0);
  readonly cargando = signal<boolean>(true);

  modoConteo: 'todas' | 'validadas' = 'todas';

  private desuscribirJrv?: Unsubscribe;

  readonly esCoordinadorRecinto = computed(
    () => this.perfil()?.rol === 'CoordRecinto'
  );

  readonly tituloAmbito = computed(() => {
    if (this.esCoordinadorRecinto()) {
      return this.recinto()?.nombre || 'Recinto Electoral';
    }
    return `Provincia ${this.perfil()?.provinciaID || 'PICHINCHA'}`;
  });

  readonly actasFiltradas = computed(() => {
    const todas = this.actasService.actas();
    if (this.modoConteo === 'validadas') {
      return todas.filter((a) => a.estado === 'Validada');
    }
    return todas;
  });

  readonly metricasGenerales = computed(() => {
    const todasActas = this.actasService.actas();
    const actasConteo = this.actasFiltradas();
    const totalJrv = this.totalJrvAmbito();

    const validadas = todasActas.filter((a) => a.estado === 'Validada').length;
    const observadas = todasActas.filter((a) => a.estado === 'Observada').length;
    const ingresadas = todasActas.length;
    const avance = totalJrv > 0 ? Math.min(1, ingresadas / totalJrv) : 0;

    const blancos = actasConteo.reduce((acc, a) => acc + (a.votosBlancos || 0), 0);
    const nulos = actasConteo.reduce((acc, a) => acc + (a.votosNulos || 0), 0);
    const sufragantes = actasConteo.reduce(
      (acc, a) => acc + (a.totalSufragantes || 0),
      0
    );

    return {
      totalJrv,
      ingresadas,
      validadas,
      observadas,
      avance,
      porcentajeAvance: Math.round(avance * 100),
      blancos,
      nulos,
      sufragantes,
    };
  });

  readonly resultadosPorLista = computed<ResultadoLista[]>(() => {
    const actasConteo = this.actasFiltradas();
    const catalogo = this.listasCatalogo();
    const acumulado = new Map<string, number>();

    for (const acta of actasConteo) {
      for (const voto of acta.votosPorLista ?? []) {
        acumulado.set(
          voto.listaID,
          (acumulado.get(voto.listaID) ?? 0) + (voto.votos || 0)
        );
      }
    }

    const totalValidos = Array.from(acumulado.values()).reduce(
      (acc, v) => acc + v,
      0
    );

    const filas: ResultadoLista[] = catalogo.map((lista) => {
      const votos = acumulado.get(lista.ID) ?? 0;
      const porcentaje =
        totalValidos > 0 ? Number(((votos / totalValidos) * 100).toFixed(2)) : 0;

      return {
        listaID: lista.ID,
        listaPerteneciente: lista.listaPerteneciente,
        siglas: lista.siglas,
        nombrePartido: lista.nombrePartido,
        candidato: lista.candidato,
        votos,
        porcentaje,
      };
    });

    return filas.sort((a, b) => b.votos - a.votos);
  });

  constructor() {
    addIcons({
      barChartOutline,
      checkmarkCircleOutline,
      documentTextOutline,
      pieChartOutline,
      warningOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.desuscribirJrv?.();
    this.actasService.detenerObservacionActas();
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargarDashboard();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async cargarDashboard(): Promise<void> {
    this.cargando.set(true);
    try {
      const listasSnap = await getDocs(collection(firestoreDb, 'listas'));
      const listas = listasSnap.docs
        .map((d) => d.data() as ListaCandidato)
        .sort((a, b) =>
          a.listaPerteneciente.localeCompare(b.listaPerteneciente)
        );
      this.listasCatalogo.set(listas);

      const usuario = this.perfil();
      const recintoID = this.recinto()?.ID || usuario?.recintoID;

      this.desuscribirJrv?.();

      if (usuario?.rol === 'CoordRecinto' && recintoID) {
        this.actasService.observarActasPorRecinto(recintoID);
        const consultaJrv = query(
          collection(firestoreDb, 'jrv'),
          where('recintoID', '==', recintoID)
        );
        this.desuscribirJrv = onSnapshot(consultaJrv, (snap) => {
          this.totalJrvAmbito.set(snap.size);
        });
      } else {
        this.actasService.observarTodasLasActas();
        this.desuscribirJrv = onSnapshot(
          collection(firestoreDb, 'jrv'),
          (snap) => {
            const items = snap.docs.map((d) => d.data() as JrvMesa);
            this.totalJrvAmbito.set(items.length);
          }
        );
      }
    } finally {
      this.cargando.set(false);
    }
  }
}