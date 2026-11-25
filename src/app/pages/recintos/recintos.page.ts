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
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import {
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  businessOutline,
  checkmarkCircleOutline,
  closeOutline,
  documentTextOutline,
  locateOutline,
  locationOutline,
  peopleOutline,
  personAddOutline,
} from 'ionicons/icons';

import { firestoreDb } from '../../core/config/backend-clients';
import {
  ActaElectoral,
  JrvMesa,
  RecintoElectoral,
  UbicacionGps,
} from '../../core/models/electoral.models';
import { ActasService } from '../../core/services/actas';
import { GeoService } from '../../core/services/geo';
import { UsuariosService } from '../../core/services/usuarios';
import { SessionStore } from '../../core/state/session.store';
import { validarCedulaEcuador } from '../../core/validators/cedula';
import { ActaVisorModalComponent } from '../../shared/components/acta-visor-modal/acta-visor-modal.component';
import { UiStateBannerComponent } from '../../shared/components/ui-state-banner/ui-state-banner.component';

interface RecintoConMetricas extends RecintoElectoral {
  mesasCount: number;
  actasRegistradas: number;
  actasObservadas: number;
  actasValidadas: number;
  actasLista: ActaElectoral[];
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
    IonButtons,
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
    IonModal,
    IonItem,
    IonInput,
    IonNote,
    UiStateBannerComponent,
  ],
  templateUrl: './recintos.page.html',
  styleUrls: ['./recintos.page.scss'],
})
export class RecintosPage implements OnInit, OnDestroy {
  private readonly sessionStore = inject(SessionStore);
  private readonly actasService = inject(ActasService);
  private readonly modalCtrl = inject(ModalController);
  private readonly geoService = inject(GeoService);
  private readonly usuariosService = inject(UsuariosService);

  readonly perfil = this.sessionStore.perfil;
  readonly recintos = signal<RecintoElectoral[]>([]);
  readonly mesas = signal<JrvMesa[]>([]);
  readonly cargando = signal<boolean>(true);

  // Modales
  readonly modalRecintoAbierto = signal<boolean>(false);
  readonly modalCoordAbierto = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly errorModal = signal<string>('');
  readonly recintoParaCoord = signal<RecintoElectoral | null>(null);

  // Datos formulario nuevo recinto
  nuevoNombreRecinto = '';
  nuevoCanton = 'QUITO';
  nuevaParroquia = '';
  nuevaDireccion = '';
  nuevoTotalJrvs = 2;
  readonly coordenadasNuevoRecinto = signal<UbicacionGps | null>(null);
  readonly capturandoGpsRecinto = signal<boolean>(false);

  // Datos formulario nuevo coordinador
  nuevoCoordCedula = '';
  nuevoCoordNombres = '';
  nuevoCoordApellidos = '';
  nuevoCoordTelefono = '';
  nuevoCoordCorreo = '';

  readonly textoBusqueda = signal<string>('');

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
        actasLista: actasDelRecinto,
      };
    });
  });

  readonly recintosFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();
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
      addCircleOutline,
      closeOutline,
      locateOutline,
      personAddOutline,
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

    this.desuscribirMesas = onSnapshot(collection(firestoreDb, 'jrvs'), (snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data() as JrvMesa;
        return { ...data, ID: data.ID || d.id };
      });
      this.mesas.set(lista);
    });

    this.actasService.observarTodasLasActas();
  }

  abrirModalRecinto(): void {
    this.errorModal.set('');
    this.nuevoNombreRecinto = '';
    this.nuevaParroquia = '';
    this.nuevaDireccion = '';
    this.nuevoTotalJrvs = 2;
    this.coordenadasNuevoRecinto.set(null);
    this.modalRecintoAbierto.set(true);
  }

  cerrarModalRecinto(): void {
    this.modalRecintoAbierto.set(false);
  }

  async capturarGpsParaRecinto(): Promise<void> {
    this.errorModal.set('');
    this.capturandoGpsRecinto.set(true);
    try {
      const pos = await this.geoService.obtenerUbicacionActual();
      this.coordenadasNuevoRecinto.set(pos);
    } catch (e) {
      this.errorModal.set(e instanceof Error ? e.message : 'Error al obtener GPS');
    } finally {
      this.capturandoGpsRecinto.set(false);
    }
  }

  async guardarRecinto(): Promise<void> {
    this.errorModal.set('');
    if (!this.nuevoNombreRecinto.trim() || !this.nuevaParroquia.trim()) {
      this.errorModal.set('Completa el nombre y la parroquia del recinto.');
      return;
    }

    const coords = this.coordenadasNuevoRecinto();
    if (!coords) {
      this.errorModal.set('Pulsa el botón para capturar las coordenadas GPS del recinto.');
      return;
    }

    this.guardando.set(true);
    try {
      const provinciaID = this.perfil()?.provinciaID || '17';
      const numConsecutivo = this.recintos().length + 1;
      const recintoID = `REC-${provinciaID}-${String(numConsecutivo).padStart(3, '0')}`;

      const nuevo: RecintoElectoral = {
        ID: recintoID,
        provinciaID,
        canton: this.nuevoCanton.trim().toUpperCase(),
        parroquia: this.nuevaParroquia.trim().toUpperCase(),
        nombre: this.nuevoNombreRecinto.trim().toUpperCase(),
        direccion: this.nuevaDireccion.trim().toUpperCase() || 'DIRECCIÓN ELECTORAL ASIGNADA',
        totalJRVS: Number(this.nuevoTotalJrvs) || 2,
        coordenadas: {
          lat: coords.lat,
          lng: coords.lng,
          precision: coords.precision ?? 12,
        },
      };

      await setDoc(doc(firestoreDb, 'recintos', recintoID), nuevo);

      // Crear mesas base para el nuevo recinto
      const totalMesas = Number(this.nuevoTotalJrvs) || 2;
      for (let i = 1; i <= totalMesas; i++) {
        const genero = i % 2 === 1 ? 'M' : 'F';
        const jrvID = `JRV-${provinciaID}-${String(numConsecutivo).padStart(3, '0')}-${String(i).padStart(2, '0')}${genero}`;
        const nuevaJrv: JrvMesa = {
          ID: jrvID,
          recintoID,
          nombreRecinto: nuevo.nombre,
          numero: i,
          genero,
          electores: 350,
          estado: 'Pendiente',
        };
        await setDoc(doc(firestoreDb, 'jrvs', jrvID), nuevaJrv);
      }

      this.cerrarModalRecinto();
    } catch (err) {
      this.errorModal.set(err instanceof Error ? err.message : 'Error al guardar recinto.');
    } finally {
      this.guardando.set(false);
    }
  }

  abrirAsignarCoordinador(recinto: RecintoElectoral): void {
    this.errorModal.set('');
    this.recintoParaCoord.set(recinto);
    this.nuevoCoordCedula = '';
    this.nuevoCoordNombres = '';
    this.nuevoCoordApellidos = '';
    this.nuevoCoordTelefono = '';
    this.nuevoCoordCorreo = '';
    this.modalCoordAbierto.set(true);
  }

  cerrarModalCoordinador(): void {
    this.modalCoordAbierto.set(false);
  }

  async guardarCoordinador(): Promise<void> {
    this.errorModal.set('');
    const recinto = this.recintoParaCoord();
    if (!recinto) return;

    if (!validarCedulaEcuador(this.nuevoCoordCedula.trim())) {
      this.errorModal.set('La cédula ingresada no es válida según el registro civil.');
      return;
    }

    if (!this.nuevoCoordNombres.trim() || !this.nuevoCoordApellidos.trim()) {
      this.errorModal.set('Ingresa nombres y apellidos completos.');
      return;
    }

    const correoCoord = this.nuevoCoordCorreo.trim().toLowerCase();
    if (!correoCoord || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoCoord)) {
      this.errorModal.set('Ingresa un correo electrónico válido.');
      return;
    }

    this.guardando.set(true);
    try {
      const nombreCompleto = `${this.nuevoCoordNombres.trim()} ${this.nuevoCoordApellidos.trim()}`;
      const nuevoUsuario = await this.usuariosService.registrarUsuarioElectoral({
        cedula: this.nuevoCoordCedula.trim(),
        nombres: this.nuevoCoordNombres.trim(),
        apellidos: this.nuevoCoordApellidos.trim(),
        telefono: this.nuevoCoordTelefono.trim(),
        correo: this.nuevoCoordCorreo.trim(),
        rol: 'CoordRecinto',
        provinciaID: recinto.provinciaID,
        recintoID: recinto.ID,
      });

      // Vincular coordinador al documento de recinto
      await updateDoc(doc(firestoreDb, 'recintos', recinto.ID), {
        coordinadorRecintoUID: nuevoUsuario.uID,
        coordinadorNombre: nombreCompleto,
      });

      this.cerrarModalCoordinador();
    } catch (err) {
      this.errorModal.set(err instanceof Error ? err.message : 'Error al crear coordinador.');
    } finally {
      this.guardando.set(false);
    }
  }

  async abrirActaRecinto(acta: ActaElectoral): Promise<void> {
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