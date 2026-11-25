import { Injectable, signal } from '@angular/core';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
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

import { environment } from '../../../environments/environment';
import { firestoreDb } from '../config/backend-clients';
import { RolSistema, UsuarioPerfil } from '../models/electoral.models';
import { validarCedulaEcuador } from '../validators/cedula';

export interface NuevoUsuarioElectoral {
  cedula: string;
  nombres: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  rol: RolSistema;
  provinciaID: string;
  recintoID?: string;
  jrvID?: string;
  claveTemporal?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly SUFIJO_CORREO = '@cne.gob.ec';

  readonly usuariosRecinto = signal<UsuarioPerfil[]>([]);
  readonly cargandoUsuarios = signal<boolean>(false);

  private desuscribirUsuarios?: Unsubscribe;

  observarUsuariosPorRecinto(recintoID: string): void {
    this.detenerObservacionUsuarios();
    this.cargandoUsuarios.set(true);

    const consulta = query(
      collection(firestoreDb, 'usuarios'),
      where('recintoID', '==', recintoID)
    );

    this.desuscribirUsuarios = onSnapshot(
      consulta,
      (snapshot) => {
        const lista = snapshot.docs
          .map((d) => d.data() as UsuarioPerfil)
          .sort((a, b) => a.nombres.localeCompare(b.nombres));

        this.usuariosRecinto.set(lista);
        this.cargandoUsuarios.set(false);
      },
      (error) => {
        console.error('Error al observar usuarios del recinto:', error);
        this.cargandoUsuarios.set(false);
      }
    );
  }

  detenerObservacionUsuarios(): void {
    if (this.desuscribirUsuarios) {
      this.desuscribirUsuarios();
      this.desuscribirUsuarios = undefined;
    }
  }

  async obtenerUsuarioPorUid(uid: string): Promise<UsuarioPerfil | null> {
    const snap = await getDoc(doc(firestoreDb, 'usuarios', uid));
    return snap.exists() ? (snap.data() as UsuarioPerfil) : null;
  }

  async obtenerTodosLosUsuarios(): Promise<UsuarioPerfil[]> {
    const snap = await getDocs(collection(firestoreDb, 'usuarios'));
    return snap.docs
      .map((d) => d.data() as UsuarioPerfil)
      .sort((a, b) => a.nombres.localeCompare(b.nombres));
  }

  async obtenerVeedoresDeRecinto(recintoID: string): Promise<UsuarioPerfil[]> {
    const consulta = query(
      collection(firestoreDb, 'usuarios'),
      where('recintoID', '==', recintoID),
      where('rol', '==', 'Veedor')
    );

    const snap = await getDocs(consulta);
    return snap.docs
      .map((d) => d.data() as UsuarioPerfil)
      .sort((a, b) => a.nombres.localeCompare(b.nombres));
  }

  async registrarUsuarioElectoral(datos: NuevoUsuarioElectoral): Promise<UsuarioPerfil> {
    const cedulaLimpia = datos.cedula.trim();

    if (!validarCedulaEcuador(cedulaLimpia)) {
      throw new Error('La cédula ingresada no es válida según el registro civil.');
    }

    const correo = (datos.correo?.trim() || `${cedulaLimpia}${this.SUFIJO_CORREO}`).toLowerCase();
    const claveInicial = (datos.claveTemporal || 'Ecuador2026').trim();

    if (claveInicial.length < 6) {
      throw new Error('La contraseña inicial debe tener al menos 6 caracteres.');
    }

    const appSecundaria = initializeApp(
      environment.firebase,
      `alta-usuario-${Date.now()}`
    );

    try {
      const authSecundario = getAuth(appSecundaria);
      const credencial = await createUserWithEmailAndPassword(
        authSecundario,
        correo,
        claveInicial
      );

      const nuevoUid = credencial.user.uid;

      try {
        await sendPasswordResetEmail(authSecundario, correo);
      } catch {
        // En emuladores o sin cuota smtp se omite envio
      }

      await signOut(authSecundario);

      const ahora = new Date().toISOString();
      const perfil: UsuarioPerfil = {
        uID: nuevoUid,
        cedula: cedulaLimpia,
        correo,
        nombres: datos.nombres.trim(),
        ...(datos.apellidos ? { apellidos: datos.apellidos.trim() } : {}),
        ...(datos.telefono ? { telefono: datos.telefono.trim() } : {}),
        rol: datos.rol,
        provinciaID: datos.provinciaID,
        primeraVezAcceso: true,
        activo: true,
        creadoEn: ahora,
        ...(datos.recintoID ? { recintoID: datos.recintoID } : {}),
        ...(datos.jrvID ? { jrvID: datos.jrvID } : {}),
      };

      await setDoc(doc(firestoreDb, 'usuarios', nuevoUid), perfil);
      return perfil;
    } finally {
      await deleteApp(appSecundaria);
    }
  }

  async actualizarAsignacionUsuario(
    uID: string,
    asignacion: { recintoID?: string; jrvID?: string }
  ): Promise<void> {
    await updateDoc(doc(firestoreDb, 'usuarios', uID), {
      ...asignacion,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async cambiarEstadoUsuario(uID: string, activo: boolean): Promise<void> {
    await updateDoc(doc(firestoreDb, 'usuarios', uID), {
      activo,
      actualizadoEn: new Date().toISOString(),
    });
  }
}