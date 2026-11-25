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
import { ListaCandidato, RecintoElectoral } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class RecintosService {
  readonly recintos = signal<RecintoElectoral[]>([]);
  readonly listasCandidatos = signal<ListaCandidato[]>([]);
  readonly cargandoRecintos = signal<boolean>(false);

  private desuscribirRecintos?: Unsubscribe;

  observarRecintosPorProvincia(provinciaID: string): void {
    this.detenerObservacionRecintos();
    this.cargandoRecintos.set(true);

    const consulta = query(
      collection(firestoreDb, 'recintos'),
      where('provinciaID', '==', provinciaID)
    );

    this.desuscribirRecintos = onSnapshot(
      consulta,
      (snapshot) => {
        const lista = snapshot.docs
          .map((d) => d.data() as RecintoElectoral)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        this.recintos.set(lista);
        this.cargandoRecintos.set(false);
      },
      (error) => {
        console.error('Error al observar recintos:', error);
        this.cargandoRecintos.set(false);
      }
    );
  }

  detenerObservacionRecintos(): void {
    if (this.desuscribirRecintos) {
      this.desuscribirRecintos();
      this.desuscribirRecintos = undefined;
    }
  }

  async obtenerTodosLosRecintos(): Promise<RecintoElectoral[]> {
    const snap = await getDocs(collection(firestoreDb, 'recintos'));
    const lista = snap.docs
      .map((d) => d.data() as RecintoElectoral)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    this.recintos.set(lista);
    return lista;
  }

  async obtenerRecintoPorId(recintoID: string): Promise<RecintoElectoral | null> {
    const snap = await getDoc(doc(firestoreDb, 'recintos', recintoID));
    return snap.exists() ? (snap.data() as RecintoElectoral) : null;
  }

  async guardarRecinto(recinto: RecintoElectoral): Promise<void> {
    await setDoc(doc(firestoreDb, 'recintos', recinto.ID), recinto, {
      merge: true,
    });
  }

  async asignarCoordinadorRecinto(
    recintoID: string,
    coordinadorRecintoUID: string
  ): Promise<void> {
    await updateDoc(doc(firestoreDb, 'recintos', recintoID), {
      coordinadorRecintoUID,
    });
  }

  async obtenerListasCandidatos(): Promise<ListaCandidato[]> {
    const snap = await getDocs(collection(firestoreDb, 'listas'));
    const listas = snap.docs
      .map((d) => d.data() as ListaCandidato)
      .sort((a, b) => a.ID.localeCompare(b.ID));

    this.listasCandidatos.set(listas);
    return listas;
  }

  async guardarListaCandidato(lista: ListaCandidato): Promise<void> {
    await setDoc(doc(firestoreDb, 'listas', lista.ID), lista, {
      merge: true,
    });
    await this.obtenerListasCandidatos();
  }
}