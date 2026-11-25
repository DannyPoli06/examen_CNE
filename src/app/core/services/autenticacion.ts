import { Injectable, signal } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firebaseAuth, firestoreDb } from '../config/backend-clients';
import { UsuarioPerfil } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly sesionUsuario = signal<User | null>(null);
  readonly perfilElectoral = signal<UsuarioPerfil | null>(null);

  private resolverInicializacion?: (perfil: UsuarioPerfil | null) => void;
  private readonly promesaSesionLista: Promise<UsuarioPerfil | null>;
  private sesionVerificada = false;

  constructor() {
    this.promesaSesionLista = new Promise<UsuarioPerfil | null>((resolve) => {
      this.resolverInicializacion = resolve;
    });

    onAuthStateChanged(firebaseAuth, async (user) => {
      this.sesionUsuario.set(user);
      let perfil: UsuarioPerfil | null = null;

      if (user) {
        try {
          perfil = await this.consultarPerfil(user.uid);
          this.perfilElectoral.set(perfil);
        } catch (err) {
          console.error('No se pudo cargar el perfil electoral:', err);
          this.perfilElectoral.set(null);
        }
      } else {
        this.perfilElectoral.set(null);
      }

      if (!this.sesionVerificada) {
        this.sesionVerificada = true;
        this.resolverInicializacion?.(perfil);
      }
    });
  }

  async esperarSesionLista(): Promise<UsuarioPerfil | null> {
    if (!this.sesionVerificada) {
      return await this.promesaSesionLista;
    }
    return this.perfilElectoral();
  }

  async iniciarSesionConCedula(cedula: string, clave: string): Promise<UsuarioPerfil> {
    const cedulaLimpia = cedula.trim();

    const consulta = query(
      collection(firestoreDb, 'usuarios'),
      where('cedula', '==', cedulaLimpia),
      limit(1)
    );
    const snap = await getDocs(consulta);

    if (snap.empty) {
      throw new Error('La cédula ingresada no tiene un perfil habilitado.');
    }

    const datosPrevios = snap.docs[0].data() as UsuarioPerfil;
    if (!datosPrevios.activo || !datosPrevios.correo) {
      throw new Error('La cédula ingresada no tiene un perfil habilitado.');
    }

    const credencial = await signInWithEmailAndPassword(
      firebaseAuth,
      datosPrevios.correo,
      clave
    );

    this.sesionUsuario.set(credencial.user);
    const perfil = await this.consultarPerfil(credencial.user.uid);

    if (!perfil || !perfil.activo) {
      await signOut(firebaseAuth);
      this.sesionUsuario.set(null);
      this.perfilElectoral.set(null);
      throw new Error('La cédula ingresada no tiene un perfil habilitado.');
    }

    this.perfilElectoral.set(perfil);
    return perfil;
  }

  async cambiarClaveInicial(nuevaClave: string): Promise<void> {
    const user = firebaseAuth.currentUser;
    const perfil = this.perfilElectoral();

    if (!user || !perfil) {
      throw new Error('No hay una sesión activa para actualizar la clave.');
    }

    await updatePassword(user, nuevaClave);

    const fechaActual = new Date().toISOString();
    await updateDoc(doc(firestoreDb, 'usuarios', perfil.uID), {
      primeraVezAcceso: false,
      actualizadoEn: fechaActual,
    });

    this.perfilElectoral.set({
      ...perfil,
      primeraVezAcceso: false,
      actualizadoEn: fechaActual,
    });
  }

  async enviarRecuperacionPorCorreo(correoOCedula: string): Promise<string> {
    const entrada = correoOCedula.trim().toLowerCase();
    let correoDestino = entrada;

    if (/^\d{10}$/.test(entrada)) {
      const consulta = query(
        collection(firestoreDb, 'usuarios'),
        where('cedula', '==', entrada),
        limit(1)
      );
      const snap = await getDocs(consulta);

      if (snap.empty) {
        throw new Error('No se encontró ninguna cuenta asociada a esa cédula.');
      }

      correoDestino = ((snap.docs[0].data() as UsuarioPerfil).correo ?? '')
        .trim()
        .toLowerCase();
    }

    if (!correoDestino || !correoDestino.includes('@')) {
      throw new Error(
        'Ingresa un correo electrónico válido o tu cédula de 10 dígitos.'
      );
    }

    await sendPasswordResetEmail(firebaseAuth, correoDestino);
    return correoDestino;
  }

  async salir(): Promise<void> {
    await signOut(firebaseAuth);
    this.sesionUsuario.set(null);
    this.perfilElectoral.set(null);
  }

  private async consultarPerfil(uid: string): Promise<UsuarioPerfil | null> {
    const snap = await getDoc(doc(firestoreDb, 'usuarios', uid));
    return snap.exists() ? (snap.data() as UsuarioPerfil) : null;
  }
}