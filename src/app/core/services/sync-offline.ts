import { Injectable, inject, signal } from '@angular/core';
import { ActasService, RegistroActaPayload } from './actas';

export interface ActaPendienteOffline extends RegistroActaPayload {
  colaID: string;
  guardadaEn: string;
  intentos: number;
  ultimoError?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncOfflineService {
  private readonly actasService = inject(ActasService);
  private readonly CLAVE_STORAGE = 'cne_actas_pendientes_offline_v1';

  readonly estaEnLinea = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  readonly colaPendiente = signal<ActaPendienteOffline[]>(this.leerColaLocal());
  readonly sincronizando = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.estaEnLinea.set(true);
        void this.sincronizarPendientes();
      });

      window.addEventListener('offline', () => {
        this.estaEnLinea.set(false);
      });
    }
  }

  /**
   * Intenta enviar el acta directamente si hay conexión.
   * Si no hay red o falla el envío por caída de conexión, la encola localmente.
   */
async enviarOEncolarActa(
    payload: RegistroActaPayload
  ): Promise<{ modo: 'online' | 'offline'; actaID: string }> {
    if (!this.estaEnLinea()) {
      const encolada = this.encolarActaLocal(payload);
      return { modo: 'offline', actaID: `ACTA-${encolada.jrv.ID}` };
    }

    try {
      const acta = await this.actasService.registrarActaElectoral({
        ...payload,
        sincronizadaOffline: false,
      });
      return {
        modo: 'online',
        actaID: acta.ID ?? `ACTA-${payload.jrv.ID}`,
      };
    } catch (error) {
      if (!navigator.onLine || this.esErrorDeRed(error)) {
        const encolada = this.encolarActaLocal(payload);
        return { modo: 'offline', actaID: `ACTA-${encolada.jrv.ID}` };
      }
      throw error;
    }
  }

  encolarActaLocal(payload: RegistroActaPayload): ActaPendienteOffline {
    const colaActual = this.leerColaLocal();
    const filtrada = colaActual.filter((item) => item.jrv.ID !== payload.jrv.ID);

    const nuevaEntrada: ActaPendienteOffline = {
      ...payload,
      colaID: `OFF-${payload.jrv.ID}`,
      guardadaEn: new Date().toISOString(),
      intentos: 0,
    };

    const nuevaCola = [...filtrada, nuevaEntrada];
    this.guardarColaLocal(nuevaCola);
    return nuevaEntrada;
  }

  async sincronizarPendientes(): Promise<{
    sincronizadas: number;
    fallidas: number;
  }> {
    if (this.sincronizando() || !this.estaEnLinea()) {
      return { sincronizadas: 0, fallidas: 0 };
    }

    const pendientes = this.leerColaLocal();
    if (pendientes.length === 0) {
      return { sincronizadas: 0, fallidas: 0 };
    }

    this.sincronizando.set(true);
    let sincronizadas = 0;
    let fallidas = 0;
    const restantes: ActaPendienteOffline[] = [];

    try {
      for (const item of pendientes) {
        try {
          await this.actasService.registrarActaElectoral({
            jrv: item.jrv,
            veedor: item.veedor,
            votosPorLista: item.votosPorLista,
            votosBlancos: item.votosBlancos,
            votosNulos: item.votosNulos,
            totalSufragantes: item.totalSufragantes,
            gps: item.gps,
            fotoDataUrl: item.fotoDataUrl,
            fotoUrlExistente: item.fotoUrlExistente,
            observacionManual: item.observacionManual,
            sincronizadaOffline: true,
          });
          sincronizadas++;
        } catch (error) {
          fallidas++;
          restantes.push({
            ...item,
            intentos: item.intentos + 1,
            ultimoError:
              error instanceof Error ? error.message : 'Error de sincronización',
          });
        }
      }

      this.guardarColaLocal(restantes);
      return { sincronizadas, fallidas };
    } finally {
      this.sincronizando.set(false);
    }
  }

  eliminarDeCola(colaID: string): void {
    const nuevaCola = this.leerColaLocal().filter((item) => item.colaID !== colaID);
    this.guardarColaLocal(nuevaCola);
  }

  private leerColaLocal(): ActaPendienteOffline[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const crudo = localStorage.getItem(this.CLAVE_STORAGE);
      return crudo ? (JSON.parse(crudo) as ActaPendienteOffline[]) : [];
    } catch {
      return [];
    }
  }

  private guardarColaLocal(cola: ActaPendienteOffline[]): void {
    this.colaPendiente.set(cola);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CLAVE_STORAGE, JSON.stringify(cola));
    }
  }

  private esErrorDeRed(error: unknown): boolean {
    const mensaje =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    return (
      mensaje.includes('network') ||
      mensaje.includes('fetch') ||
      mensaje.includes('offline') ||
      mensaje.includes('failed to fetch') ||
      mensaje.includes('unavailable')
    );
  }
}