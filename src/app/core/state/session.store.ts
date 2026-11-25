import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { JrvMesa, RecintoElectoral } from '../models/electoral.models';
import { AuthService } from '../services/autenticacion';
import { JrvService } from '../services/jrv';
import { RecintosService } from '../services/recintos';

@Injectable({
  providedIn: 'root',
})
export class SessionStore {
  private readonly authService = inject(AuthService);
  private readonly recintosService = inject(RecintosService);
  private readonly jrvService = inject(JrvService);

  readonly perfil = this.authService.perfilElectoral;
  readonly recintoAsignado = signal<RecintoElectoral | null>(null);
  readonly jrvAsignada = signal<JrvMesa | null>(null);
  readonly cargandoContexto = signal<boolean>(false);

  readonly estaAutenticado = computed(() => this.perfil() !== null);
  readonly rolActual = computed(() => this.perfil()?.rol ?? null);
  readonly requiereCambioClave = computed(
    () => this.perfil()?.primeraVezAcceso === true
  );

  constructor() {
    effect(() => {
      const usuario = this.perfil();
      if (!usuario) {
        this.recintoAsignado.set(null);
        this.jrvAsignada.set(null);
        return;
      }

      void this.cargarContextoOperativo(usuario.recintoID, usuario.jrvID);
    });
  }

  async cargarContextoOperativo(
    recintoID?: string,
    jrvID?: string
  ): Promise<void> {
    this.cargandoContexto.set(true);
    try {
      if (recintoID) {
        const recinto = await this.recintosService.obtenerRecintoPorId(recintoID);
        this.recintoAsignado.set(recinto);
      } else {
        this.recintoAsignado.set(null);
      }

      if (jrvID) {
        const jrv = await this.jrvService.obtenerJrvPorId(jrvID);
        this.jrvAsignada.set(jrv);
      } else {
        this.jrvAsignada.set(null);
      }
    } catch (error) {
      console.error('Error al cargar contexto operativo de la sesión:', error);
    } finally {
      this.cargandoContexto.set(false);
    }
  }
}