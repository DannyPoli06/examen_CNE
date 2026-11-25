import { Injectable, signal } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { firebaseAuth, firestoreDb } from '../config/backend-clients';
import { UsuarioPerfil } from '../models/electoral.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly SUFIJO_CORREO = '@cne.gob.ec';

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

  async ingresarConCedula(cedula: string, clave: string): Promise<UsuarioPerfil> {
    const correo = `${cedula.trim()}${this.SUFIJO_CORREO}`;
    const credencial = await signInWithEmailAndPassword(firebaseAuth, correo, clave);

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