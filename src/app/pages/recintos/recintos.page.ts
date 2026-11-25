import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import {
  Unsubscribe,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  locationOutline,
  peopleOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  ActaElectoral,
  JrvMesa,
  RecintoElectoral,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { SessionStore } from '../../core/state/session.store';
import { ActaVisorModalComponent } from '../../shared/components/acta-visor-modal/acta-visor-modal.component';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

interface RecintoConMetricas extends RecintoElectoral {
  mesasCount: number;
  actasRegistradas: number;
  actasObservadas: number;
  actasValidadas: number;
}

@Component({
  selector: 'app-recintos',
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
    IonSearchbar,
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
  templateUrl: './recintos.page.html',
  styleUrls: ['./recintos.page.scss'],
})
export class RecintosPage implements OnInit, OnDestroy {
  private readonly sessionStore = inject(SessionStore);
  private readonly actasService = inject(ActasService);
  private readonly modalCtrl = inject(ModalController);

  readonly perfil = this.sessionStore.perfil;
  readonly recintos = signal<RecintoElectoral[]>([]);
  readonly mesas = signal<JrvMesa[]>([]);
  readonly cargando = signal<boolean>(true);

  textoBusqueda = '';

  private desuscribirRecintos?: Unsubscribe;
  private desuscribirMesas?: Unsubscribe;

  readonly recintosConMetricas = computed<RecintoConMetricas[]>(() => {
    const todasMesas = this.mesas();
    const todasActas = this.actasService.actas();

    return this.recintos().map((recinto) => {
      const mesasDelRecinto = todasMesas.filter((m) => m.recintoID === recinto.ID);
      const actasDelRecinto = todasActas.filter((a) => a.recintoID === recinto.ID);

      return {
        ...recinto,
        mesasCount: mesasDelRecinto.length || recinto.totalJRVS || 0,
        actasRegistradas: actasDelRecinto.length,
        actasObservadas: actasDelRecinto.filter((a) => a.estado === 'Observada').length,
        actasValidadas: actasDelRecinto.filter((a) => a.estado === 'Validada').length,
      };
    });
  });

  readonly recintosFiltrados = computed(() => {
    const texto = this.textoBusqueda.trim().toLowerCase();
    if (!texto) {
      return this.recintosConMetricas();
    }

    return this.recintosConMetricas().filter(
      (r) =>
        r.nombre.toLowerCase().includes(texto) ||
        r.canton.toLowerCase().includes(texto) ||
        r.parroquia.toLowerCase().includes(texto) ||
        r.ID.toLowerCase().includes(texto)
    );
  });

  readonly resumenProvincial = computed(() => {
    const lista = this.recintosConMetricas();
    return {
      recintos: lista.length,
      jrvTotal: lista.reduce((acc, r) => acc + r.mesasCount, 0),
      actasEnviadas: lista.reduce((acc, r) => acc + r.actasRegistradas, 0),
      actasValidadas: lista.reduce((acc, r) => acc + r.actasValidadas, 0),
    };
  });

  constructor() {
    addIcons({
      businessOutline,
      checkmarkCircleOutline,
      documentTextOutline,
      locationOutline,
      peopleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.iniciarSuscripciones();
  }

  ngOnDestroy(): void {
    this.desuscribirRecintos?.();
    this.desuscribirMesas?.();
    this.actasService.detenerObservacionActas();
  }

  async refrescar(event: CustomEvent): Promise<void> {
    this.iniciarSuscripciones();
    (event.target as HTMLIonRefresherElement).complete();
  }

  iniciarSuscripciones(): void {
    this.cargando.set(true);
    this.desuscribirRecintos?.();
    this.desuscribirMesas?.();

    const provinciaID = this.perfil()?.provinciaID;

    const consultaRecintos = provinciaID
      ? query(
          collection(firestoreDb, 'recintos'),
          where('provinciaID', '==', provinciaID)
        )
      : collection(firestoreDb, 'recintos');

    this.desuscribirRecintos = onSnapshot(
      consultaRecintos,
      (snap) => {
        const lista = snap.docs
          .map((d) => {
            const data = d.data() as RecintoElectoral;
            return { ...data, ID: data.ID || d.id };
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        this.recintos.set(lista);
        this.cargando.set(false);
      },
      (error) => {
        console.error('Error al observar recintos:', error);
        this.cargando.set(false);
      }
    );

    this.desuscribirMesas = onSnapshot(collection(firestoreDb, 'jrv'), (snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data() as JrvMesa;
        return { ...data, ID: data.ID || d.id };
      });
      this.mesas.set(lista);
    });

    this.actasService.observarTodasLasActas();
  }

  async abrirUltimaActaRecinto(recintoID: string): Promise<void> {
    const acta: ActaElectoral | undefined = this.actasService
      .actas()
      .find((a) => a.recintoID === recintoID);

    if (!acta) return;

    const modal = await this.modalCtrl.create({
      component: ActaVisorModalComponent,
      componentProps: {
        acta,
        puedeValidar: true,
      },
    });

    await modal.present();
  }
}