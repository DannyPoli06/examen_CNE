import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonNote,
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
  addCircleOutline,
  businessOutline,
  checkmarkDoneOutline,
  closeOutline,
  documentTextOutline,
  peopleOutline,
  personAddOutline,
  searchOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  EstadoMesa,
  JrvMesa,
  UsuarioPerfil,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { UsuariosService } from '../../core/services/usuarios';
import { SessionStore } from '../../core/state/session.store';
import { validarCedulaEcuador } from '../../core/validators/cedula';
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
    IonButtons,
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
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    IonModal,
    IonInput,
    IonNote,
    UiStateBannerComponent,
  ],
  templateUrl: './mesas.page.html',
  styleUrls: ['./mesas.page.scss'],
})
export class MesasPage implements OnInit, OnDestroy {
  private readonly sessionStore = inject(SessionStore);
  private readonly actasService = inject(ActasService);
  private readonly modalCtrl = inject(ModalController);
  private readonly usuariosService = inject(UsuariosService);

  readonly recinto = this.sessionStore.recintoAsignado;
  readonly mesas = signal<JrvMesa[]>([]);
  readonly veedores = signal<UsuarioPerfil[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly guardandoVeedorId = signal<string>('');

  // Modal crear veedor
  readonly modalVeedorAbierto = signal<boolean>(false);
  readonly guardandoNuevoVeedor = signal<boolean>(false);
  readonly errorModalVeedor = signal<string>('');

  nuevoVeedorCedula = '';
  nuevoVeedorNombres = '';
  nuevoVeedorApellidos = '';
  nuevoVeedorTelefono = '';
  nuevoVeedorCorreo = '';
  mesaAsignarInicial = '';

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
      addCircleOutline,
      closeOutline,
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

  abrirModalCrearVeedor(): void {
    this.errorModalVeedor.set('');
    this.nuevoVeedorCedula = '';
    this.nuevoVeedorNombres = '';
    this.nuevoVeedorApellidos = '';
    this.nuevoVeedorTelefono = '';
    this.nuevoVeedorCorreo = '';
    this.mesaAsignarInicial = '';
    this.modalVeedorAbierto.set(true);
  }

  cerrarModalCrearVeedor(): void {
    this.modalVeedorAbierto.set(false);
  }

  async guardarNuevoVeedor(): Promise<void> {
    this.errorModalVeedor.set('');
    const recintoID = this.recinto()?.ID || this.sessionStore.perfil()?.recintoID;
    const provinciaID = this.sessionStore.perfil()?.provinciaID || '17';

    if (!recintoID) {
      this.errorModalVeedor.set('No se identificó el recinto asignado.');
      return;
    }

    if (!validarCedulaEcuador(this.nuevoVeedorCedula.trim())) {
      this.errorModalVeedor.set('Ingresa una cédula válida de 10 dígitos.');
      return;
    }

    if (!this.nuevoVeedorNombres.trim() || !this.nuevoVeedorApellidos.trim()) {
      this.errorModalVeedor.set('Completa los nombres y apellidos del veedor.');
      return;
    }

    const correoVeedor = this.nuevoVeedorCorreo.trim().toLowerCase();
    if (!correoVeedor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoVeedor)) {
      this.errorModalVeedor.set('Ingresa un correo electrónico válido.');
      return;
    }

    this.guardandoNuevoVeedor.set(true);
    try {
      const nombreCompleto = `${this.nuevoVeedorNombres.trim()} ${this.nuevoVeedorApellidos.trim()}`;
      const nuevo = await this.usuariosService.registrarUsuarioElectoral({
        cedula: this.nuevoVeedorCedula.trim(),
        nombres: this.nuevoVeedorNombres.trim(),
        apellidos: this.nuevoVeedorApellidos.trim(),
        telefono: this.nuevoVeedorTelefono.trim(),
        correo: this.nuevoVeedorCorreo.trim(),
        rol: 'Veedor',
        provinciaID,
        recintoID,
        ...(this.mesaAsignarInicial ? { jrvID: this.mesaAsignarInicial } : {}),
      });

      if (this.mesaAsignarInicial) {
        await updateDoc(doc(firestoreDb, 'jrvs', this.mesaAsignarInicial), {
          veedorUID: nuevo.uID,
          veedorNombre: nombreCompleto,
        });
      }

      await this.cargarVeedoresRecinto(recintoID);
      this.cerrarModalCrearVeedor();
    } catch (err) {
      this.errorModalVeedor.set(err instanceof Error ? err.message : 'Error al crear veedor.');
    } finally {
      this.guardandoNuevoVeedor.set(false);
    }
  }

  private observarMesasRecinto(recintoID: string): void {
    this.desuscribirMesas?.();

    const consulta = query(
      collection(firestoreDb, 'jrvs'),
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
        updateDoc(doc(firestoreDb, 'jrvs', mesa.ID), {
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
    const todas = this.actasService.actas();
    const actaMesa = todas.find((a) => a.jrvID === mesa.ID);
    const acta = actaMesa || (await this.actasService.obtenerActaPorId(mesa.actaID || `ACTA-${mesa.ID}-Alcalde`));
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