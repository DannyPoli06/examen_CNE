import { Injectable, inject, signal } from '@angular/core';
import {
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestoreDb } from '../config/backend-clients';
import {
  ActaElectoral,
  EstadoMesa,
  EstadoRegistroActa,
  JrvMesa,
  UbicacionGps,
  UsuarioPerfil,
  VotoPorLista,
} from '../models/electoral.models';
import { evaluarCuadreActa } from '../validators/acta';
import { CamaraService } from './camara';
import { JrvService } from './jrv';

export interface RegistroActaPayload {
  jrv: JrvMesa;
  veedor: UsuarioPerfil;
  votosPorLista: VotoPorLista[];
  votosBlancos: number;
  votosNulos: number;
  totalSufragantes: number;
  gps: UbicacionGps;
  fotoDataUrl?: string;
  fotoUrlExistente?: string;
  observacionManual?: string;
  sincronizadaOffline?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ActasService {
  private readonly camaraService = inject(CamaraService);
  private readonly jrvService = inject(JrvService);

  readonly actas = signal<ActaElectoral[]>([]);
  readonly cargandoActas = signal<boolean>(false);

  private desuscribirActas?: Unsubscribe;

  observarActasPorRecinto(recintoID: string): void {
    this.detenerObservacionActas();
    this.cargandoActas.set(true);

    const consulta = query(
      collection(firestoreDb, 'actas'),
      where('recintoID', '==', recintoID)
    );

    this.desuscribirActas = onSnapshot(
      consulta,
      (snapshot) => {
        const lista = snapshot.docs
          .map((d) => d.data() as ActaElectoral)
          .sort((a, b) => a.jrvNumero - b.jrvNumero);

        this.actas.set(lista);
        this.cargandoActas.set(false);
      },
      (error) => {
        console.error('Error al observar actas del recinto:', error);
        this.cargandoActas.set(false);
      }
    );
  }

  observarTodasLasActas(): void {
    this.detenerObservacionActas();
    this.cargandoActas.set(true);

    this.desuscribirActas = onSnapshot(
      collection(firestoreDb, 'actas'),
      (snapshot) => {
        const lista = snapshot.docs
          .map((d) => d.data() as ActaElectoral)
          .sort(
            (a, b) =>
              a.recintoID.localeCompare(b.recintoID) || a.jrvNumero - b.jrvNumero
          );

        this.actas.set(lista);
        this.cargandoActas.set(false);
      },
      (error) => {
        console.error('Error al observar todas las actas:', error);
        this.cargandoActas.set(false);
      }
    );
  }

  detenerObservacionActas(): void {
    if (this.desuscribirActas) {
      this.desuscribirActas();
      this.desuscribirActas = undefined;
    }
  }

  async obtenerActaPorId(actaID: string): Promise<ActaElectoral | null> {
    const snap = await getDoc(doc(firestoreDb, 'actas', actaID));
    return snap.exists() ? (snap.data() as ActaElectoral) : null;
  }

  async obtenerActasPorVeedor(veedorUID: string): Promise<ActaElectoral[]> {
    const consulta = query(
      collection(firestoreDb, 'actas'),
      where('veedorUID', '==', veedorUID)
    );

    const snap = await getDocs(consulta);
    return snap.docs
      .map((d) => d.data() as ActaElectoral)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  }

  async registrarActaElectoral(payload: RegistroActaPayload): Promise<ActaElectoral> {
    const {
      jrv,
      veedor,
      votosPorLista,
      votosBlancos,
      votosNulos,
      totalSufragantes,
      gps,
      fotoDataUrl,
      fotoUrlExistente,
      observacionManual,
      sincronizadaOffline = false,
    } = payload;

    const cuadre = evaluarCuadreActa({
      votosPorLista,
      votosBlancos,
      votosNulos,
      totalSufragantes,
      electoresHabilitadosJrv: jrv.electores,
    });

    let fotoUrl = fotoUrlExistente ?? '';
    if (!fotoUrl) {
      if (!fotoDataUrl) {
        throw new Error('La fotografía del acta es obligatoria para el envío.');
      }
      fotoUrl = await this.camaraService.subirFotoActa(
        fotoDataUrl,
        jrv.recintoID,
        jrv.ID
      );
    }

    const notas: string[] = [];
    if (cuadre.observacion) {
      notas.push(cuadre.observacion);
    }
    if (observacionManual?.trim()) {
      notas.push(observacionManual.trim());
    }

    const actaID = `ACTA-${jrv.ID}`;
    const acta: ActaElectoral = {
      ID: actaID,
      recintoID: jrv.recintoID,
      nombreRecinto: jrv.nombreRecinto,
      jrvID: jrv.ID,
      jrvNumero: jrv.numero,
      veedorUID: veedor.uID,
      veedorCedula: veedor.cedula,
      veedorNombre: veedor.nombres,
      votosPorLista,
      votosBlancos,
      votosNulos,
      totalSufragantes,
      totalCalculado: cuadre.totalCalculado,
      fotoUrl,
      gps,
      estado: cuadre.estadoSugerido,
      sincronizadaOffline,
      creadaEn: new Date().toISOString(),
      ...(notas.length > 0 ? { observacion: notas.join(' | ') } : {}),
    };

    await setDoc(doc(firestoreDb, 'actas', actaID), acta);

    const nuevoEstadoJrv: EstadoMesa =
      acta.estado === 'Validada' ? 'Registrada' : 'Observada';

    await this.jrvService.actualizarEstadoJrv(jrv.ID, nuevoEstadoJrv, actaID);

    return acta;
  }

  async actualizarEstadoActa(
    acta: ActaElectoral,
    estado: EstadoRegistroActa,
    observacion?: string
  ): Promise<void> {
    if (!acta.ID) {
      throw new Error('El acta no tiene un identificador válido.');
    }

    const cambios: Partial<ActaElectoral> = {
      estado,
      observacion: observacion?.trim() || '',
    };

    await updateDoc(doc(firestoreDb, 'actas', acta.ID), cambios);

    const estadoJrv: EstadoMesa =
      estado === 'Validada' ? 'Registrada' : 'Observada';

    await this.jrvService.actualizarEstadoJrv(acta.jrvID, estadoJrv, acta.ID);
  }
}