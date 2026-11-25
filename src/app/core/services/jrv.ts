import { Injectable, signal } from '@angular/core';
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
import { EstadoMesa, JrvMesa } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class JrvService {
  readonly jrvsRecinto = signal<JrvMesa[]>([]);
  readonly cargandoJrvs = signal<boolean>(false);

  private desuscribirJrvs?: Unsubscribe;

  observarJrvsPorRecinto(recintoID: string): void {
    this.detenerObservacionJrvs();
    this.cargandoJrvs.set(true);

    const consulta = query(
      collection(firestoreDb, 'jrvs'),
      where('recintoID', '==', recintoID)
    );

    this.desuscribirJrvs = onSnapshot(
      consulta,
      (snapshot) => {
        const mesas = snapshot.docs
          .map((d) => d.data() as JrvMesa)
          .sort((a, b) => a.numero - b.numero || a.genero.localeCompare(b.genero));

        this.jrvsRecinto.set(mesas);
        this.cargandoJrvs.set(false);
      },
      (error) => {
        console.error('Error al observar JRVs del recinto:', error);
        this.cargandoJrvs.set(false);
      }
    );
  }

  detenerObservacionJrvs(): void {
    if (this.desuscribirJrvs) {
      this.desuscribirJrvs();
      this.desuscribirJrvs = undefined;
    }
  }

  async obtenerJrvPorId(jrvID: string): Promise<JrvMesa | null> {
    const snap = await getDoc(doc(firestoreDb, 'jrvs', jrvID));
    return snap.exists() ? (snap.data() as JrvMesa) : null;
  }

  async obtenerJrvsPorVeedor(veedorUID: string): Promise<JrvMesa[]> {
    const consulta = query(
      collection(firestoreDb, 'jrvs'),
      where('veedorUID', '==', veedorUID)
    );

    const snap = await getDocs(consulta);
    return snap.docs
      .map((d) => d.data() as JrvMesa)
      .sort((a, b) => a.numero - b.numero || a.genero.localeCompare(b.genero));
  }

  async obtenerTodasLasJrvs(): Promise<JrvMesa[]> {
    const snap = await getDocs(collection(firestoreDb, 'jrvs'));
    return snap.docs
      .map((d) => d.data() as JrvMesa)
      .sort(
        (a, b) =>
          a.recintoID.localeCompare(b.recintoID) ||
          a.numero - b.numero ||
          a.genero.localeCompare(b.genero)
      );
  }

  async guardarJrv(jrv: JrvMesa): Promise<void> {
    await setDoc(doc(firestoreDb, 'jrvs', jrv.ID), jrv, { merge: true });
  }

  async asignarVeedorAJrv(
    jrvID: string,
    veedorUID: string,
    veedorNombre: string
  ): Promise<void> {
    await updateDoc(doc(firestoreDb, 'jrvs', jrvID), {
      veedorUID,
      veedorNombre,
    });
  }

  async actualizarEstadoJrv(
    jrvID: string,
    estado: EstadoMesa,
    actaID?: string
  ): Promise<void> {
    const cambios: Partial<JrvMesa> = { estado };
    if (actaID !== undefined) {
      cambios.actaID = actaID;
    }

    await updateDoc(doc(firestoreDb, 'jrvs', jrvID), cambios);
  }
}