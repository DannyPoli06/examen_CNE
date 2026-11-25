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
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import {
  Unsubscribe,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  personAddOutline,
  peopleOutline,
  searchOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  EstadoMesa,
  JrvMesa,
  UsuarioPerfil,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { SessionStore } from '../../core/state/session.store';
import { ActaVisorModalComponent } from '../../shared/components/acta-visor-modal/acta-visor-modal.component';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

@Component({
  selector: 'app-mesas',
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
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    UiStateBannerComponent,
  ],
  templateUrl: './mesas.page.html',
  styleUrls: ['./mesas.page.scss'],
})
export class MesasPage implements OnInit, OnDestroy {
  private readonly sessionStore = inject(SessionStore);
  private readonly actasService = inject(ActasService);
  private readonly modalCtrl = inject(ModalController);

  readonly recinto = this.sessionStore.recintoAsignado;
  readonly mesas = signal<JrvMesa[]>([]);
  readonly veedores = signal<UsuarioPerfil[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly guardandoVeedorId = signal<string>('');

  filtroEstado: 'Todos' | EstadoMesa = 'Todos';
  textoBusqueda = '';

  private desuscribirMesas?: Unsubscribe;

  readonly mesasFiltradas = computed(() => {
    const estado = this.filtroEstado;
    const texto = this.textoBusqueda.trim().toLowerCase();

    return this.mesas().filter((mesa) => {
      const coincideEstado = estado === 'Todos' || mesa.estado === estado;
      const coincideTexto =
        !texto ||
        String(mesa.numero).includes(texto) ||
        mesa.ID.toLowerCase().includes(texto) ||
        (mesa.veedorNombre ?? '').toLowerCase().includes(texto);

      return coincideEstado && coincideTexto;
    });
  });

  readonly resumenEstados = computed(() => {
    const lista = this.mesas();
    return {
      total: lista.length,
      registradas: lista.filter((m) => m.estado === 'Registrada').length,
      observadas: lista.filter((m) => m.estado === 'Observada').length,
      pendientes: lista.filter((m) => m.estado === 'Pendiente').length,
    };
  });

  constructor() {
    addIcons({
      businessOutline,
      checkmarkDoneOutline,
      documentTextOutline,
      personAddOutline,
      peopleOutline,
      searchOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.iniciarCargaRecinto();
  }

  ngOnDestroy(): void {
    this.desuscribirMesas?.();
    this.actasService.detenerObservacionActas();
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.iniciarCargaRecinto();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async iniciarCargaRecinto(): Promise<void> {
    this.cargando.set(true);
    try {
      const perfil = this.sessionStore.perfil();
      const recintoID = this.recinto()?.ID || perfil?.recintoID;

      if (!recintoID) {
        this.cargando.set(false);
        return;
      }

      this.actasService.observarActasPorRecinto(recintoID);
      this.observarMesasRecinto(recintoID);
      await this.cargarVeedoresRecinto(recintoID);
    } finally {
      this.cargando.set(false);
    }
  }

  private observarMesasRecinto(recintoID: string): void {
    this.desuscribirMesas?.();

    const consulta = query(
      collection(firestoreDb, 'jrv'),
      where('recintoID', '==', recintoID)
    );

    this.desuscribirMesas = onSnapshot(consulta, (snap) => {
      const lista = snap.docs
        .map((d) => {
          const data = d.data() as JrvMesa;
          return { ...data, ID: data.ID || d.id };
        })
        .sort((a, b) => a.numero - b.numero);

      this.mesas.set(lista);
      this.cargando.set(false);
    });
  }

  private async cargarVeedoresRecinto(recintoID: string): Promise<void> {
    const consulta = query(
      collection(firestoreDb, 'usuarios'),
      where('rol', '==', 'Veedor'),
      where('recintoID', '==', recintoID)
    );

    const snap = await getDocs(consulta);
    const lista = snap.docs
      .map((d) => d.data() as UsuarioPerfil)
      .filter((u) => u.activo);

    this.veedores.set(lista);
  }

  async asignarVeedor(mesa: JrvMesa, veedorUID: string): Promise<void> {
    const veedor = this.veedores().find((v) => v.uID === veedorUID);
    if (!veedor) return;

    this.guardandoVeedorId.set(mesa.ID);
    try {
      await Promise.all([
        updateDoc(doc(firestoreDb, 'jrv', mesa.ID), {
          veedorUID: veedor.uID,
          veedorNombre: veedor.nombres,
        }),
        updateDoc(doc(firestoreDb, 'usuarios', veedor.uID), {
          jrvID: mesa.ID,
          recintoID: mesa.recintoID,
        }),
      ]);
    } finally {
      this.guardandoVeedorId.set('');
    }
  }

  async verActaMesa(mesa: JrvMesa): Promise<void> {
    const actaID = mesa.actaID || `ACTA-${mesa.ID}`;
    const acta = await this.actasService.obtenerActaPorId(actaID);
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

  colorEstado(estado: EstadoMesa): string {
    switch (estado) {
      case 'Registrada':
        return 'success';
      case 'Observada':
        return 'danger';
      default:
        return 'warning';
    }
  }
}